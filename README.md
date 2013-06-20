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
    reference: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',,
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

## License ##

[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0.txt)

(Ends)
