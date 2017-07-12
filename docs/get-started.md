# 2.1. Configuration

# 2.2 Object presentations
<a name="presentations"></a>

When you define a resources, it’s important to know, that there are different presentations of instances of your resource.


## 2.2.1 Native presentation
<a name="presentations-native"></a>

Usually native presentation is a plain javaScript object which could be read from your database (or other microservice or anything else) or could be written there. E.g. if we have resource user, its native presentation could look like
```
{
	id: "0113875d-31a1-4ef0-94f6-94cc33bed19b",
	name: "John Doe",
	password: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
	isAdmin: true
}
```

apme works with native presentations, caches them if you use [caching feature](define.md#cache), uses them to check permissions if you use [permissions feature](define.md#perms), but apme does never send native presentations to API users.


## 2.2.2 Jsonapi object presentation
<a name="presentations-jsonapi"></a>

Before placing objects to API responses, apme converts them to jsonapi presentation.

E.g. for user resource jsonapi presentation, could look like
```
{
	id: "0113875d-31a1-4ef0-94f6-94cc33bed19b",
	attributes: {
		name: "John Doe"
}
}
```

To show apme how to convert native presentation to jsonapi and vise-versa, you could define _fields_ property.
```
apme.define(‘users’, {
fields: {
	name: {
		schema: Joi.string()
},
	password: {
		schema: Joi.string()
		get: false,
		set: (data, val) => {
			data.password = crypto.createHash(‘sha1’).update(val).update(‘secret-password-salt’).digest(‘hex’);
		}
}
}
});
```

As you can see, two fields for user jsonapi presentation are defined there. For each field you could specify properties:
[get](define.md#fields-get) - function to retrieve value of property from native object
[set](define.md#fields-set) - function to set value of native object
[schema](define.md#fields-schema) - schema to validate user input on creation or updating
By default _get_ reads property of the same name from native presentation, and _set_ - updates the property with the same name.
So, we shouldn’t define get/set for _name_ field, because property _name_ persists in native representation.
By providing value false for _get_ or _set_, we talk to apme, that we don’t want to allow user see or modificate value of this field.
E.g. we don’t want to allow user to see password hash. We also want to hash user’s password on updating, that’s why we define custom get method for password field.

Note: it’s recommended always to use schema for writable fields. Otherwise apme won’t validate fields and user could pass any json value there.

Note: in some specific cases, you could define your own transform method (packAttrs and unpackAttrs) to convert instance from native presentation to json api attributes and vice-versa instead of describing fields. In this case you also should implement validation yourself in the unpackAttrs function.

Note: any native presentation should contain unique id. By default, apme uses _id_ property of native presentation object. But if your native presentation has another unique identifier, or it should be calculated from other fields, you could define method (getId)[define.md#getId] to show apme how to calc unique identifier.