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

test('createZone.js: createZone()', function(t) {
    // mock the response
    route53
        .post('/2011-05-05/hostedzone')
        .replyWithFile(201, __dirname + '/CreateHostedZoneResponse.xml')
    ;

    // get the zones
    var args = {
        // these are completely ignored when mocking this call!!!
        name      : 'example.com',
        reference : 'myUniqueIdentifier',
        comment   : 'This is my first hosted zone.',
    };
    r53.createZone(args, function(err, result) {
        t.equal(err, null, 'There is no error');

        t.equal(result.zoneId, 'Z1PA6795UKMFR9', 'zoneId is correct');
        t.equal(result.name, 'example.com', 'name is correct');
        t.equal(result.reference, 'myUniqueIdentifier', 'reference is correct');
        t.equal(result.comment, 'This is my first hosted zone.', 'comment is correct');

        t.equal(result.changeId, 'C1PA6795UKMFR9', 'changeId is correct');
        t.equal(result.status, 'PENDING', 'status is correct');
        t.equal(result.submittedAt, '2012-03-15T01:36:41.958Z', 'SubmittedAt date is the same');

        t.equal(result.nameServers.length, 4, 'four nameservers');

        t.end();
    });

});

// ----------------------------------------------------------------------------
