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

test('zones.js: zones test, for one zone', function(t) {
    // mock the response
    route53
        .get('/2011-05-05/hostedzone')
        .replyWithFile(200, __dirname + '/ListHostedZonesResponse-1.xml')
    ;

    // get the zones
    r53.zones(function(err, zones) {
        t.equal(err, null, 'There is no error');

        t.equal(zones.length, 1, 'Only one hosted zone is returned');
        t.equal(zones[0].zoneId, 'Z1PA6795UKMFR9', 'zoneId is correct');
        t.equal(zones[0].name, 'example.com', 'name is correct (without the trailing dot)');
        t.equal(zones[0].reference, 'My Ref', 'reference is correct');
        t.equal(zones[0].comment, 'A Comment', 'comment is correct');

        t.end();
    });

});

test('zones.js: zones test, for two zones', function(t) {
    // mock the response
    route53
        .get('/2011-05-05/hostedzone')
        .replyWithFile(200, __dirname + '/ListHostedZonesResponse-2.xml')
    ;

    // get the zones
    r53.zones(function(err, zones) {
        t.equal(err, null, 'There is no error');

        t.equal(zones.length, 2, 'Only one hosted zone is returned');

        t.equal(zones[0].zoneId, 'DEADBEEF1234', 'zoneId is correct');
        t.equal(zones[0].name, 'example.com', 'name is correct (without the trailing dot)');
        t.equal(zones[0].reference, 'My Ref', 'reference is correct');
        t.equal(zones[0].comment, 'A Comment', 'comment is correct');

        t.equal(zones[1].zoneId, 'CAFEBABE5678', 'zoneId is correct');
        t.equal(zones[1].name, 'example.net', 'name is correct (without the trailing dot)');
        t.equal(zones[1].reference, 'My Ref', 'reference is correct');
        t.equal(zones[1].comment, 'A Comment', 'comment is correct');

        t.end();
    });

});

// ----------------------------------------------------------------------------
