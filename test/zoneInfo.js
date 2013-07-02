// ----------------------------------------------------------------------------

// npm
var test = require('tape');
var nock = require('nock');

// local
var Route53 = require('../nice-route53.js');

// ----------------------------------------------------------------------------

// create the mock server and client for Route53
var route53 = nock('https://route53.amazonaws.com');
var r53 = new Route53({
    accessKeyId     : 'xxx',
    secretAccessKey : 'xxx',
});

test('zoneInfo.js: zoneInfo() using a zoneId', function(t) {
    // mock the GetHostedZone
    route53
        .get('/2011-05-05/hostedzone/Z1PA6795UKMFR9')
        .replyWithFile(200, __dirname + '/GetHostedZoneResponse.xml')
    ;

    // get the zones
    r53.zoneInfo('Z1PA6795UKMFR9', function(err, zoneInfo) {
        t.equal(err, null, 'There is no error');

        t.equal(zoneInfo.zoneId, 'Z1PA6795UKMFR9', 'zoneId is correct');
        t.equal(zoneInfo.name, 'example.com', 'name is correct');
        t.equal(zoneInfo.reference, 'myUniqueIdentifier', 'reference is correct');
        t.equal(zoneInfo.comment, 'This is my first hosted zone.', 'comment is correct');
        t.equal(zoneInfo.nameServers.length, 4, 'four nameservers');

        t.end();
    });

});

test('zoneInfo.js: zoneInfo() using a domain name', function(t) {
    // mock the ListHostedZones
    route53
        .get('/2011-05-05/hostedzone')
        .replyWithFile(200, __dirname + '/ListHostedZonesResponse-1.xml')
    ;

    // mock the GetHostedZones
    route53
        .get('/2011-05-05/hostedzone/Z1PA6795UKMFR9')
        .replyWithFile(200, __dirname + '/GetHostedZoneResponse.xml')
    ;

    // get the zones
    r53.zoneInfo('example.com', function(err, zoneInfo) {
        t.equal(err, null, 'There is no error');

        t.equal(zoneInfo.zoneId, 'Z1PA6795UKMFR9', 'zoneId is correct');
        t.equal(zoneInfo.name, 'example.com', 'name is correct');
        t.equal(zoneInfo.reference, 'myUniqueIdentifier', 'reference is correct');
        t.equal(zoneInfo.comment, 'This is my first hosted zone.', 'comment is correct');
        t.equal(zoneInfo.nameServers.length, 4, 'four nameservers');

        t.end();
    });

});

// ----------------------------------------------------------------------------
