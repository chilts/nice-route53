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

test('records.js: records()', function(t) {
    // firstly, mock the GetHostedZone
    route53
        .get('/2011-05-05/hostedzone/Z1PA6795UKMFR9')
        .replyWithFile(200, __dirname + '/GetHostedZoneResponse.xml')
    ;

    // mock the ListResourceRecordSetsResponse
    route53
        .get('/2011-05-05/hostedzone/Z1PA6795UKMFR9/rrset')
        .replyWithFile(200, __dirname + '/ListResourceRecordSetResponse-1.xml')
    ;

    // get the zones
    r53.records('Z1PA6795UKMFR9', function(err, records) {
        t.equal(err, null, 'There is no error');

        t.equal(records.length, 5, 'there are 5 resource records');

        t.equal(records[0].type, 'NS', 'the first record is the nameservers');
        t.equal(records[0].values.length, 4, 'there are 4 nameservers');

        t.equal(records[4].type, 'MX', 'the last record is the MX servers');
        t.equal(records[4].values.length, 7, 'there are 7 MX records');

        t.end();
    });

});

// ----------------------------------------------------------------------------
