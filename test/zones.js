// ----------------------------------------------------------------------------
//
//
//
//
//
// ----------------------------------------------------------------------------

// npm
var test = require('tape');
var nock = require('nock');
var Route53 = require('../nice-route53.js');

// ----------------------------------------------------------------------------

// create the mock server and client for Route53
var route53 = nock('https://route53.amazonaws.com');
var r53 = new Route53({
    accessKeyId     : 'xxx',
    secretAccessKey : 'xxx',
});

test('zones test', function(t) {
    // set up the response
    var response = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<ListHostedZonesResponse xmlns="https://route53.amazonaws.com/doc/2012-12-12/"> ',
        '   <HostedZones>',
        '      <HostedZone>',
        '         <Id>/hostedzone/DEADBEEF1234</Id>',
        '         <Name>example.com.</Name>',
        '         <CallerReference>My Ref</CallerReference>',
        '         <Config>',
        '            <Comment>A Comment</Comment>',
        '         </Config>',
        '         <ResourceRecordSetCount>4</ResourceRecordSetCount>',
        '      </HostedZone>',
        '   </HostedZones>',
        '   <IsTruncated>false</IsTruncated>',
        '   <MaxItems>100</MaxItems>',
        '</ListHostedZonesResponse>',
    ].join("\n");

    // mock the ListHostedZones
    route53.get('/2011-05-05/hostedzone').reply(200, response);

    // get the zones
    r53.zones(function(err, zones) {
        t.equal(err, null, 'There is no error');

        t.equal(zones.length, 1, 'Only one hosted zone is returned');
        t.equal(zones[0].zoneId, 'DEADBEEF1234', 'zoneId is correct');
        t.equal(zones[0].name, 'example.com', 'name is correct (without the trailing dot)');
        t.equal(zones[0].reference, 'My Ref', 'reference is correct');
        t.equal(zones[0].comment, 'A Comment', 'comment is correct');

        t.end();
    });

});

// ----------------------------------------------------------------------------
