;/**
 * @fileOverview DB Class
 * @author <a href="http://ngsdev.org/">Atsushi Nagase </a>
 * @license <a href="http://www.apache.org/licenses/LICENSE-2.0">Apache License 2.0</a>
 * @global DBClass
 */

/** @static
 * @class */
DBClass.Adapter = {
	/** @member
	 * @constant */
	HTML5 : "html5",
	/** @member
	 * @constant */
	GEARS : "gears",
	/** @member
	 * @constant */
	YAHOO : "yahoo",
	/** @member
	 * @constant */
	AIR : "air",
	/** @member
	 * @constant */
	AUTO  : "auto"
}
 
/**
 * @class
 * @constructor
 */
function DBClass() {
	throw Error("DBClass has no constructor");
}

/**
 * @static
 * @function
 * @param {String} name Database name or Path to database(Yahoo).
 * @param {int} type Database size; If Yahoo,this will be ignored.
 * @param {DBClass.Adapter} type Database type; If Yahoo, this will be ignored.
 * @param {String} version Database version; If Yahoo, this will be ignored.
 * @param {String} comment Database comment; If Yahoo, this will be ignored.
 */
DBClass.create = function(name,size,type,version,comment) {
	if(!name)  throw Error("Parameter:name is required.");
	var c = function() {
		this.name = name||this.name;
		this.size = size||this.size;
		this.type = type||this.type;
		this.version = version||this.vertion;
		this.comment = this.comment;
		this.db = DBClass.detectDB(this);
	};
	c.prototype = DBClass.prototype;
	return c;
}

/**
 * @private
 * @static
 */
DBClass.detectDB = function(ins) {
	var db;
	switch(ins.type) {
	case DBClass.Adapter.HTML5:
		db = openDatabase(ins.name, ins.version, ins.comment, ins.size);
		return db;
		break;
	case DBClass.Adapter.GEARS:
		db = google.gears.factory.create("beta.database");
		db.open(ins.name);
		return db;
		break;
	case DBClass.Adapter.YAHOO:
		db = new SQLite();
		db.open(ins.name);
		return db;
		break;
	case DBClass.Adapter.AIR:
		var f = new air.File("app-storage:/"+ins.name);
		db = {
			file : f,
			connection : new air.SQLConnection()
		};
		return db;
		break;
	case DBClass.Adapter.AUTO:
		var e;
		for(var i in DBClass.Adapter) {
			var t = DBClass.Adapter[i];
			if(t==DBClass.Adapter.AUTO) continue;
			try {
				ins.type = t;
				db = DBClass.detectDB(ins);
				if(db) return db;
			} catch(e) {}
		}
		throw Error("Database is not supported.");
		break;
	}
}

/** @class */
DBClass.prototype = {
	/**
	 * Database name or database filename.
	 * @type String
	 */
	name : "",
	/**
	 * Database size; If not HTML5, this will be ignored.
	 * @type int
	 * @default 200000
	 */
	size : 200000,
	/**
	 * Database type; If not HTML5, this will be ignored.
	 * @type DBClass.Adapter
	 * @default DBClass.Adapter.AUTO
	 */
	type : DBClass.Adapter.AUTO,
	/**
	 * Database version; If not HTML5, this will be ignored.
	 * @type String
	 * @default 1.0
	 */
	verion : "1.0",
	/**
	 * Database comment; If not HTML5, this will be ignored.
	 * @type String
	 * @default Uncommented database generated by DBClass.js
	 */
	comment : "Uncommented database generated by DBClass.js",
	/**
	 * Database instance.
	 * @type Object
	 */
	db : null,
	/**
	 * @param {String} table Table name.
	 * @param {Array.&lt;AbstractSQL.Field&gt;} fields Array contains AbstractSQL.Field class instances.
	 * @returns DBClass.Schema
	 * @param {Boolean} createManually
	 */
	schema : function(table,fields,createManually) {
		return new DBClass.Schema(this,table,fields,createManually);
	}
}

/**
 * @class
 * @constructor
 * @param {DBClass} db
 * @param {String} name Table name.
 * @param {Array.&lt;AbstractSQL.Field&gt;} fields Array contains AbstractSQL.Field class instances.
 * @param {Boolean} createManually
 */
DBClass.Schema = function(db,name,fields,createManually) {
	this.name = name;
	this.db = db;
	this.fields = fields;
	this.createManually = !!createManually;
}

/** @class */
DBClass.Schema.prototype = {
	/**
	 * Initialize Schema
	 * @param {Function} callback
	 */
	init : function(callback) {
		var sql = new AbstractSQL(this.name);
		var schema = this;
		var db = schema.db.db;
		callback = callback || function(){};
		var f = function() {
			if(!schema.createManually) {
				schema.exec(sql.createTable(schema.fields,true,false),function(){
					callback.apply(schema,[this]);
				});
			}
		}
		if(schema.db.type==DBClass.Adapter.AIR) {
			db.connection.addEventListener(air.SQLEvent.OPEN, function(e){
				f();
			});
			db.connection.addEventListener(air.SQLErrorEvent.ERROR, function(e){
				var res = new DBClass.Result(null);
				res.success = false;
				res.error = e.error;
				callback.apply(schema,[res]);
			});
			db.connection.openAsync(db.file);
		} else {
			f();
		}
	},
	/**
	 * If true, don't create table automatic.
	 * @type Boolean
	 */
	createManually : false,
	/**
	 * Table name
	 * @type String
	 */
	name : "",
	/**
	 * Array contains AbstractSQL.Field class instances.
	 * @type Array.&lt;AbstractSQL.Field&gt;
	 */
	fields : null,
	/**
	 * Execute SQL
	 * @param {AbstractSQL} sql First callback argument in DBClass.Result instance.
	 * @param {Function} callback
	 * @param {Array.<String>} bind Bind Variables; Not supported in Yahoo
	 */
	exec : function(sql,callback,bind) {
		var schema = this;
		var isSelect = new RegExp("^select .+","i").test(sql);
		var db = schema.db.db;
		callback = callback || function(){};
		bind = bind||[];
		var callbackError = function(err) {
			var res = new DBClass.Result(null);
			res.success = false;
			res.sql = sql;
			res.error = err;
			callback.apply(res);
		}
		var callbackSuccess = function(each,item,length) {
			var res = new DBClass.Result(isSelect?r:null);
			if(isSelect) {
				res.each = each;
				res.item = item;
				res.length = length;
			}
			res.success = true;
			res.sql = sql;
			callback.apply(res);
		}
		switch(schema.db.type) {
		case DBClass.Adapter.YAHOO:
			try {
				var r = isSelect?db.query(sql):db.exec(sql);
				if(!r) return callbackError(new Error("No result."));
				if(isSelect) {
					var rows = r.getAll();
					callbackSuccess(
						function(cb) {
							for(var i=0;i<rows.length;i++) {
								cb.apply(this.item(i),[i,this]);
							}
						},
						function(idx) { return rows[idx]; },
						rows.length
					);
					return;
				}
				callbackSuccess();
				return;
			} catch(err) {
				callbackError(err);
				return;
			}
			callbackError(err);
			return;
		case DBClass.Adapter.AIR:
			if(!db.connection.connected) return callbackError(new Error("Not connected."));
			var stmt = new air.SQLStatement();
			stmt.sqlConnection = db.connection;
			stmt.addEventListener(air.SQLEvent.RESULT, function(e){
				if(isSelect) {
					var res = stmt.getResult();
					if(res==null||res.data==null) return callbackError();
					callbackSuccess(
						function(cb) {
							for(var i=0;i<res.data.length;i++) {
								cb.apply(this.item(i),[i,this]);
							}
						},
						function(idx) { return res.data[idx]; },
						res.data.length
					)
					return;
				}
				callbackSuccess();
				
			});
			stmt.addEventListener(air.SQLErrorEvent.ERROR, function(e){
				callbackError(e.error);
			});
			stmt.text = sql.toString();
			stmt.execute();
			return;
		case DBClass.Adapter.GEARS:
			try {
				var r = db.execute(sql);
				if(isSelect) {
					var ar = [];
					while(r.isValidRow()){
						var itm = {};
						for(var i=0;i<r.fieldCount();i++) {
							itm[r.fieldName(i)] = r.field(i);
						}
						ar.push(itm);
						r.next();
					}
					r.close();
					callbackSuccess(
						function(cb) {
							for(var i=0;i<ar.length;i++) {
								cb.apply(this.item(i),[i,this]);
							}
						},
						function(idx) { return ar[idx]; },
						ar.length
					);
					return;
					
				}
				if(r) {
					r.close();
					callbackSuccess();
					return;
				}
			} catch(e) {
				callbackError(e);
				return;
			}
			callbackError();
			return;
		default:
			db.transaction(function(tx){
				tx.executeSql(sql,bind,function(tx,r){
					if(isSelect) {
						var rows = r.rows;
						callbackSuccess(
							function(cb) {
								for(var i=0;i<rows.length;i++) {
									cb.apply(rows.item(i),[i,this]);
								}
							},
							function(idx) { return rows.item(idx); },
							rows.length
						);
						return;
					}
					callbackSuccess();
					return;
				},function(tx,err){
					callbackError(err);
					return;
				});
			});
			return;
		}
	},
	/**
	 * Select rows
	 * @param {Array.&lt;String&gt;} fields
	 * @param {AbstractSQL.Where|AbstractSQL.WhereList} where
	 * @param {int} limit
	 * @param {AbstractSQL.Order} order
	 * @param {Function} callback
	 */
	select : function(fields,where,limit,order,callback) {
		var sql = new AbstractSQL(this.name);
		var schema = this;
		callback = callback||function(){};
		schema.exec(sql.select(fields,where,limit,order),function(){
			callback.apply(this,[this.success]);
		});
		
	},
	/**
	 * Insert data
	 * @param {Map.&lt;String,mixed&gt;} data
	 * @param {AbstractSQL.Conflict} onConflict
	 * @param {Function} callback
	 */
	insert : function(data,onConflict,callback) {
		var sql = new AbstractSQL(this.name);
		var schema = this;
		callback = callback||function(){};
		schema.exec(sql.insert(data,onConflict),function(){
			callback.apply(this,[this.success]);
		});
		
	},
	/**
	 * Update rows
	 * @param {Map.&lt;String,String&gt;} data
	 * @param {AbstractSQL.Where|AbstractSQL.WhereList} where
	 * @param {AbstractSQL.Conflict} on conflict
	 * @param {Function} callback
	 */
	update : function(data,where,onConflict,callback) {
		var sql = new AbstractSQL(this.name);
		var schema = this;
		callback = callback||function(){};
		schema.exec(sql.update(data,where,onConflict),function(){
			callback.apply(this,[this.success]);
		});
	},
	/**
	 * Remove rows
	 * @param {AbstractSQL.Where|AbstractSQL.WhereList} where
	 * @param {Function} callback
	 */
	remove : function(where,callback) {
		var sql = new AbstractSQL(this.name);
		var schema = this;
		callback = callback||function(){};
		schema.exec(sql.remove(where),function(){
			callback.apply(this,[this.success]);
		});
	},
	/**
	 * Get rows size, first argument of callback is number.
	 * @param {AbstractSQL.Where} where
	 * @param {Function} callback
	 */
	count : function(where,callback) {
		var sql = new AbstractSQL(this.name);
		var schema = this;
		if(typeof where == "function") {
			callback = where;
			where = null;
		}
		callback = callback||function(){};
		schema.exec(sql.count("*",where),function(){
			var r = !this.error&&this.resultSet?this.resultSet.rows:false;
			if(!r) return callback.apply(this,[-1]);
			var o = r.item(0);
			for(var i in o) {
				return callback.apply(this,[o[i]]);
			}
		});
	},
	/**
	 * Drop table
	 * @param {Function} callback
	 */
	drop : function(callback) {
		var sql = new AbstractSQL(this.name);
		var schema = this;
		callback = callback||function(){};
		schema.exec(sql.dropTable(true),function(){
			callback.apply(this,[!this.error]);
		});
		
	}
}

/**
 * Called from only DBClass#select
 * @constructor
 * @param {SQLResultSet} resultSet
 */
DBClass.Result = function() {
}

/**
 * @class
 */
DBClass.Result.prototype = {
	/** @private */
	sql : "",
	/**
	 * @type Error
	 */
	error : null,
	/**
	 * @type Boolean
	 */
	success : false,
	/**
	 * @type int
	 */
	length : 0,
	/**
	 * Called each items.
	 * @param {Function} func
	 */
	each : function(){ throw Error("DBClass.Result#each can use only result of select method."); },
	/**
	 * @param {int} idx
	 */
	item : function(){ throw Error("DBClass.Result#item can use only result of select method."); }
}