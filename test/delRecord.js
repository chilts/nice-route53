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

test('delRecord.js: delRecord() for an existing record', function(t) {
    // firstly, mock the GetHostedZone
    route53
        .get('/2011-05-05/hostedzone/Z1PA6795UKMFR9')
        .replyWithFile(200, __dirname + '/GetHostedZoneResponse.xml')
    ;

    // then, mock the ListResourceRecordSetsResponse
    route53
        .get('/2011-05-05/hostedzone/Z1PA6795UKMFR9/rrset')
        .replyWithFile(200, __dirname + '/ListResourceRecordSetResponse-1.xml')
    ;

    // then, mock the ChangeResourceRecordSets
    route53
        .post('/2011-05-05/hostedzone/Z1PA6795UKMFR9/rrset')
        .replyWithFile(200, __dirname + '/ChangeResourceRecordSetsResponse-1.xml')
    ;

    // delete a record
    var args = {
        zoneId : 'Z1PA6795UKMFR9',
        name   : 'example.com',
        type   : 'A',
        ttl    : 600,
    };
    r53.delRecord(args, function(err, changeInfo) {
        t.equal(err, null, 'There is no error');

        t.equal(changeInfo.changeId, 'C2682N5HXP0BZ4', 'changeId is correct');
        t.equal(changeInfo.status, 'PENDING', 'Change is PENDING');
        t.equal(changeInfo.submittedAt, '2012-10-09T06:12:42.058Z', 'SubmittedAt date is the same');

        t.end();
    });

});

test("delRecord.js: delRecord() for a record that doesn't exist", function(t) {
    // firstly, mock the GetHostedZone
    route53
        .get('/2011-05-05/hostedzone/Z1PA6795UKMFR9')
        .replyWithFile(200, __dirname + '/GetHostedZoneResponse.xml')
    ;

    // then, mock the ListResourceRecordSetsResponse
    route53
        .get('/2011-05-05/hostedzone/Z1PA6795UKMFR9/rrset')
        .replyWithFile(200, __dirname + '/ListResourceRecordSetResponse-1.xml')
    ;

    // then, mock the ChangeResourceRecordSets
    route53
        .post('/2011-05-05/hostedzone/Z1PA6795UKMFR9/rrset')
        .replyWithFile(200, __dirname + '/ChangeResourceRecordSetsResponse-1.xml')
    ;

    // delete a record
    var args = {
        zoneId : 'Z1PA6795UKMFR9',
        name   : 'non-existing.example.com',
        type   : 'A',
        ttl    : 600,
    };
    r53.delRecord(args, function(err, changeInfo) {
        t.ok(err, 'There is an error');
        t.equal(changeInfo, undefined, 'There is no changeInfo');

        t.equal(err.type, 'NiceRoute53-Client', 'it is a client error');
        t.equal(err.code, 'RecordNotFound', 'we cannot find this record');
        t.equal(err.msg, 'The record you asked to delete could not be found.', 'msg is correct');

        t.end();
    });

});

// ----------------------------------------------------------------------------
