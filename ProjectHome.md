[Documentation](http://sqljs.googlecode.com/svn/trunk/docs/index.html)

---


## DBClass.js ##
An O/R Mapper, supporting Adobe AIR, Gears, HTML5, Yahoo! Widgets.<br /><br />
[Download from SVN Repository](http://sqljs.googlecode.com/svn/trunk/src/DBClass.js)<br /><br />
Notepad Demos:
[HTML5](http://sqljs.googlecode.com/svn/trunk/tests/html5/notepad.html?a=html5) / [GEARS](http://sqljs.googlecode.com/svn/trunk/tests/html5/notepad.html?a=gears)
<br /><br />
### Example: ###
```
// DBClass.create returns new Class instance
var MyDB = DBClass.create("dbclass_test",10000,DBClass.Adapter.AUTO,"1.0","DBClass Demo");
// Create new instance
var db = new MyDB();
// Defining fields
var id = new AbstractSQL.Field(
  "id",  AbstractSQL.FieldType.INTEGER, null, true, null, AbstractSQL.Conflict.ABORT,
  true, true, AbstractSQL.Conflict.FAIL, true, AbstractSQL.Conflict.FAIL
);
var name = new AbstractSQL.Field(
  "name", AbstractSQL.FieldType.TEXT, 0xff
);
var fields = [id,name]
// Initialize schema
var schema = db.schema("sample", fields);
schema.init(onSchemaInitialize);

function onSchemaInitialize(success) {
  if(!success) return alert("Failed to Initialize schema!");
  // SELECT id, name FROM sample;
  schema.select(["id", "name"], null, null, null, function(success) {
    if(!success) return alert(this.error.message||"An error has occurred.");
    this.each(function(i){ // Called for each rows.
      console.log( this.id, this.name );
    });
  });
}

```


---


## AbstractSQL.js ##
Generates SQL syntax from JavaScript object structure.<br /><br />
[Download from SVN Repository](http://sqljs.googlecode.com/svn/trunk/src/AbstractSQL.js)<br />
[Demo](http://sqljs.googlecode.com/svn/trunk/tests/AbstractSQL.html)
<br /><br />
### Example: ###
```
var sql = new AbstractSQL("test");
sql.select(["id","name"],[
	new AbstractSQL.WhereList(AbstractSQL.Logic.OR,[
		new AbstractSQL.Where("id",100),
		new AbstractSQL.Where("id","101")
	])
]);
console.log(sql);
// SELECT id,name FROM test WHERE (id=100 OR id='101');
```

&lt;wiki:gadget url="http://sqljs.googlecode.com/svn/trunk/misc/AbstractSQL.embtowiki.xml" width="100%" height="310" border="0" title="Try here." /&gt;


---


[![](http://nakanohito.jp/an/?u=154899&h=659334&w=48&ex=.png)](http://nakanohito.jp/)