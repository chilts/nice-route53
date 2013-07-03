```
       _                                _       ____ _____ 
 _ __ (_) ___ ___       _ __ ___  _   _| |_ ___| ___|___ / 
| '_ \| |/ __/ _ \_____| '__/ _ \| | | | __/ _ \___ \ |_ \ 
| | | | | (_|  __/_____| | | (_) | |_| | ||  __/___) |__) |
|_| |_|_|\___\___|     |_|  \___/ \__,_|\__\___|____/____/ 
                                                           
```

This package provides the API you really wanted to Amazon's Route53 service. It uses AwsSum's
[awssum-amazon-route53](https://github.com/awssum/awssum-amazon-route53) to talk to the real API.

[![Build Status](https://api.travis-ci.org/chilts/nice-route53.png)](https://api.travis-ci.org/chilts/nice-route53.png)

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
[ { zoneId: 'xxxxxxxxxxxxxx',
    name: 'chilts.org',
    reference: 'chilts.org',
    comment: '' },
  { zoneId: 'xxxxxxxxxxxxxx',
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
{ zoneId: 'xxxxxxxxxxxxxx',
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
{ zoneId: 'xxxxxxxxxxxxx',
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

This command returns a list of all of the resource records for the ```zoneId``` provided:

```
r53.records('xxxxxxxxxxxxxx', function(err, records) {
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

### .setRecord() ###

This command lets you set a record whether or not it already exists. If it exists it issues a DELETE on the old one and
a CREATE for the new one. If it doesn't already exist, then it just issues a CREATE.

```
var args = {
    zoneId : 'xxxxxxxxxxxxx',
    name   : 'localhost.chilts.org',
    type   : 'A',
    ttl    : 600,
    values : [
        '127.0.0.1',
    ],
};
r53.setRecord(args, function(err, res) {
    console.log(res);
});
```

Will give a changeset such as:

```
{ changeId: 'xxxxxxxxxxxxxx',
  url: '/change/xxxxxxxxxxxxxx',
  status: 'PENDING',
  submittedAt: '2013-06-21T00:03:26.297Z' }
```

### .delRecord() ###

This command lets you delete an existing record. Nice Route53 will complain if you try and delete a resource
record that doesn't exist. It will issue a DELETE on the resource record if it does exist.

```
var args = {
    zoneId : 'xxxxxxxxxxxxx',
    name   : 'localhost.chilts.org',
    type   : 'A',
};
r53.delRecord(args, function(err, res) {
    console.log(res);
});
```

Will give a changeset such as:

```
{ changeId: 'xxxxxxxxxxxxxx',
  url: '/change/xxxxxxxxxxxxxx',
  status: 'PENDING',
  submittedAt: '2013-06-21T00:03:26.297Z' }
```

### .getChange() ###

This gets you a changeInfo response from a ```changeId```:

```
r53.getChange('xxxxxxxxxxxxxx', function(err, res) {
    console.log(res);
});
```

Will give a changeset such as:

```
{ changeId: 'xxxxxxxxxxxxxx',
  url: '/change/xxxxxxxxxxxxxx',
  status: 'INSYNC',
  submittedAt: '2013-06-21T00:03:26.297Z' }
```

## Polling for Status Changes ##

### .pollChangeUntilInSync() ###

Once you have called either ```.createZone()``` or ```.setRecord()```, you will have access to a ```changeId```. You
could do polling yourself using ```.getChange()``` or you could use this command to help you.

```
var ee = r53.pollChangeUntilInSync(res.changeId, 10);
ee.on('attempt', function(changeInfo) {
    console.log('Attempted a poll');
});
ee.on('pending', function(changeInfo) {
    console.log('Still PENDING:', changeInfo);
});
ee.on('insync', function(changeInfo) {
    console.log('Now INSYNC:', changeInfo);
});
ee.on('error', function(err) {
    console.log('error:', err);
});
```

Note: 'attempt' is emitted once we receive the result of every ```.getChange()```, irrespective of whether the status
is still PENDING or INSYNC. Only one of 'pending' or 'insync' is emitted after every 'attempt'.

## Combining Changes with Polling ##

For the various operations which add/change/remove a zone or record, you will receive a ```changeId``` in the callback
(if successful). If you want to, you can then poll that change until it's status is 'INSYNC'.

However, if you'd like to do all of this with the same command, you can provide a ```pollEvery``` value (in seconds) so
that the operation will set it up for you.

For example, let's say you add a new zone and then poll until it is 'INSYNC', you can do this, with the equivalent new
call shown afterwards:

```
r53.createZone(args, function(err, zone) {
    // error checking here

    var ee = r53.pollChangeUntilInSync(zone.changeId, 10);
    ee.on('insync', function(changeInfo) {
        console.log('Now INSYNC:', changeInfo);
    });
});

r53.createZone(args, 10, function(err, zone, ee) {
    // error checking here

    ee.on('insync', function(changeInfo) {
        console.log('Now INSYNC:', changeInfo);
    });
});
```

In the cases where the change operation fails (ie. ```err``` is set, then both the ```zone``` and ```ee``` will be
undefined.


## License ##

[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0.txt)

(Ends)
