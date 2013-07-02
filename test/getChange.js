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

test('getChange.js: getChange()', function(t) {
    // mock the response
    route53
        .get('/2011-05-05/change/ZERON0WTZIPP')
        .replyWithFile(200, __dirname + '/GetChangeResponse.xml')
    ;

    // get the zones
    r53.getChange('ZERON0WTZIPP', function(err, changeInfo) {
        t.equal(err, null, 'There is no error');

        t.equal(changeInfo.changeId, 'ZERON0WTZIPP', 'changeId is correct');
        t.equal(changeInfo.status, 'PENDING', 'Change is PENDING');
        t.equal(changeInfo.submittedAt, '2011-09-10T01:36:41.958Z', 'SubmittedAt date is the same');

        t.end();
    });

});

// ----------------------------------------------------------------------------
