```
       _                                _       ____ _____ 
 _ __ (_) ___ ___       _ __ ___  _   _| |_ ___| ___|___ / 
| '_ \| |/ __/ _ \_____| '__/ _ \| | | | __/ _ \___ \ |_ \ 
| | | | | (_|  __/_____| | | (_) | |_| | ||  __/___) |__) |
|_| |_|_|\___\___|     |_|  \___/ \__,_|\__\___|____/____/ 
                                                           
```

This package provides the API you really wanted to Amazon's Route53 service. It uses AwsSum's
[awssum-amazon-route53](https://github.com/awssum/awssum-amazon-route53) to talk to the real API.

## Synopsis ##

```
var Route53 = require('nice-route53');

var r53 = new Route53({
    accessKeyId     : process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey : process.env.AWS_SECRET_ACCESS_KEY,
});

r53.zones(function(err, domains) {
    console.log(domains);
});
```

## Operations ##

### .zones() ###

This operations lists all of your zones in Route53 with these credentials:

```
route53.zones(function(err, zones) {
    // zones is an array of zones
    console.log(zones);
});
```

An example of a list of zones is:

```
[ { id: 'xxxxxxxxxxxxxx',
    name: 'chilts.org',
    reference: 'chilts.org',
    comment: '' },
  { id: 'xxxxxxxxxxxxxx',
    name: 'example.com',
    reference: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    comment: 'Created 2013-06-14' } ]
```

### .createZone() ###

```
route53.createZone(function(err, zone) {
    console.log(zone);
});
```

An example of a new zone is:

```
{ id: 'xxxxxxxxxxxxxx',
  name: 'example.org',
  reference: 'example.org',
  status: 'PENDING',
  submittedAt: '2013-06-20T03:53:19.888Z',
  changeId: 'xxxxxxxxxxxxxx',
  nameServers:
   [ 'ns-xxx.awsdns-xx.org',
     'ns-xxx.awsdns-xx.co.uk',
     'ns-xxx.awsdns-xx.net',
     'ns-xxx.awsdns-xx.com' ],
  comment: 'Created 2013-06-20' }
```

Caveat: if you try to create a zone for ```example.org```, we send a ```CallerReference``` of ```example.org```. This
is so that you will get an error if you try to create a second zone for the same domain name. If you *actually* want to
create a 2nd zone for the same domain name, you should use the low-level API for ```CreateHostedZone``` that
awssum-amazon-route53 provides - this library won't do that for you.

### .zoneInfo() ###

You can either call this with a ```domainName``` or a ```zoneId```. In both cases you'll get the zone info back:

```
r53.zoneInfo('chilts.org', function(err, zoneInfo) {
    console.log(zoneInfo);
});
r53.zoneInfo('xxxxxxxxxxxxx', function(err, zoneInfo) {
    console.log(zoneInfo);
});
```

An example of the zoneInfo is:

```
{ id: 'xxxxxxxxxxxxx',
  name: 'example.com',
  reference: 'example.com',
  nameServers:
   [ 'ns-xxx.awsdns-xx.org',
     'ns-xxx.awsdns-xx.co.uk',
     'ns-xxx.awsdns-xx.net',
     'ns-xxx.awsdns-xx.com' ] }
```

If you provide a ```zoneId``` then ```zoneInfo()``` will use the ```GetHostedZone``` operation. If you have provided a
```domainName```, then the ```.zones()``` operation is called first, the correct zone found and then
```GetHostedZone``` is called with the ```zoneId```.

### .records() ###

This command returns a list of all of the resource records for the ```zoneId``` provided. You may also provide a
```type``` to get records of only that type.

```
var args = {
    zoneId : 'xxxxxxxxxxxxxx',
};
r53.records(args, function(err, records) {
    console.log(records);
});
```

To get records of only type 'A', try this:

```
var args = {
    zoneId : 'xxxxxxxxxxxxxx',
    type   : 'A',
};
r53.records(args, function(err, records) {
    console.log(records);
});
```

The records returned look like:

```
[ { name: 'example.net.',
    type: 'A',
    ttl: '300',
    values: [ '192.168.1.1' ] },
  { name: 'example.net.',
    type: 'NS',
    ttl: '172800',
    values:
     [ 'ns-xxx.awsdns-xx.net.',
       'ns-xxx.awsdns-xx.com.',
       'ns-xxx.awsdns-xx.org.',
       'ns-xxx.awsdns-xx.co.uk.' ] },
  { name: 'example.net.',
    type: 'SOA',
    ttl: '900',
    values: [ 'ns-xxx.awsdns-xx.net. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400' ] },
  { name: 'localhost.example.net.',
    type: 'A',
    ttl: '604800',
    values: [ '127.0.0.1' ] } ]
```

## License ##

[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0.txt)

(Ends)
