// ----------------------------------------------------------------------------
//
// nice-route53.js
//
// Copyright (c) 2013 Mozilla Corporation.
//
// ----------------------------------------------------------------------------

var awssumAmazonRoute53 = require('awssum-amazon-route53');

// ----------------------------------------------------------------------------
// internal functions

function extractZoneId(id) {
    var m = id.match(/\/([^\/]+)$/);
    return m[1];
}

function extractChangeId(id) {
    return id.match(/^\/change\/(.+)$/)[1];
}

function convertListHostedZonesResponse(response) {
    // the list to return
    var zones = [];

    // if this response only has one item, then it'll be an object, not an array
    if ( Object.prototype.toString.call(response) === '[object Object]' ) {
        response = [ response ];
    }

    response.forEach(function(zone) {
        zones.push({
            id        : extractZoneId(zone.Id),
            name      : zone.Name.substr(0, zone.Name.length-1),
            reference : zone.CallerReference,
            comment   : zone.Config && zone.Config.Comment,
        });
    });

    return zones;
}

function convertGetHostedZoneResponseToZoneInfo(response) {
    var info = response.Body.GetHostedZoneResponse;

    var hostedZone = info.HostedZone;

    var zone = {
        id          : extractZoneId(hostedZone.Id),
        name        : hostedZone.Name.substr(0, hostedZone.Name.length-1),
        reference   : hostedZone.CallerReference,
    };

    if ( info.ChangeInfo ) {
        zone.status      = info.ChangeInfo.Status;
        zone.submittedAt = info.ChangeInfo.SubmittedAt;
        zone.changeId    = extractChangeId(info.ChangeInfo.Id);
    }

    if ( info.DelegationSet ) {
        zone.nameServers = info.DelegationSet.NameServers.NameServer;
    }

    if ( hostedZone.Config && hostedZone.Config.Comment ) {
        zone.comment = hostedZone.Config.Comment;
    }

    return zone;
}

function makeError(err) {
    // if this is an error from AwsSum
    if ( err.Code === 'AwsSum-Request' ) {
        return {
            type    : 'Request',
            code    : err.OriginalError.code,
            msg     : '' + err.OriginalError,
            syscall : err.OriginalError.syscall,
            errno   : err.OriginalError.errno,
        };
    }

    // an error from AWS itself
    return {
        type : err.Body.ErrorResponse.Error.Type,
        code : err.Body.ErrorResponse.Error.Code,
        msg  : err.Body.ErrorResponse.Error.Message,
    };
}

// ----------------------------------------------------------------------------
// the external API

function Route53(opts) {
    var self = this;

    // create a client
    self.client = new awssumAmazonRoute53.Route53(opts);

    return self;
}

Route53.prototype.zones = function(callback) {
    var self = this;

    // save the zones somewhere
    var zones = [];

    function listHostedZones(nextMarker, callback) {
        var args = {};
        if ( nextMarker ) {
            args.Marker = nextMarker;
        }
        self.client.ListHostedZones(args, function(err, response) {
            if (err) return callback(makeError(err));

            // shortcut to the real response and save the zones
            var hostedZones = response.Body.ListHostedZonesResponse.HostedZones.HostedZone;
            zones = zones.concat(convertListHostedZonesResponse(hostedZones));

            // if this response contains IsTruncated, then we need to re-query
            if ( response.Body.ListHostedZonesResponse.IsTruncated === 'true' ) {
                return listHostedZones(response.Body.ListHostedZonesResponse.NextMarker, callback);
            }

            callback(null, zones);
        });
    }

    // start this operation
    listHostedZones(null, callback);
};

// takes either a zoneId or a domainName
Route53.prototype.zoneInfo = function(input, callback) {
    var self = this;

    // if this looks like a domainName
    if ( input.match(/\./) ) {
        self.zones(function(err, zones) {
            if (err) return callback(err);
            zones.forEach(function(zone) {
                // if we find this domain name, then call zoneInfo() with the zoneId
                if ( zone.name === input ) {
                    self.zoneInfo(zone.id, callback);
                }
            });
        });
    }
    else {
        // looks like a zoneId, so just call GetHostedZone
        self.client.GetHostedZone({ HostedZoneId : input }, function(err, response) {
            if (err) return callback(makeError(err));

            var zoneInfo = convertGetHostedZoneResponseToZoneInfo(response);
            callback(null, zoneInfo);
        });
    }
};

Route53.prototype.createZone = function(args, poll, callback) {
    var self = this;

    // see if the user wants to poll for status completion
    if ( typeof poll === 'function' ) {
        callback = poll;
        poll = undefined;
    }

    var realArgs = {
        Name            : args.name,
        CallerReference : args.name,
    };

    if ( args.comment ) {
        realArgs.Comment = args.comment;
    }

    self.client.CreateHostedZone(realArgs, function(err, response) {
        if (err) {
            err = makeError(err);
            return callback(err);
        }

        // get the interesting info
        var info = response.Body.CreateHostedZoneResponse;

        var hostedZone = info.HostedZone;
        var changeInfo = info.ChangeInfo;
        var delegationSet = info.DelegationSet;

        var zone = {
            id          : extractZoneId(hostedZone.Id),
            name        : hostedZone.Name.substr(0, hostedZone.Name.length-1),
            reference   : hostedZone.CallerReference,
            status      : changeInfo.Status,
            submittedAt : changeInfo.SubmittedAt,
            changeId    : extractChangeId(changeInfo.Id),
            nameServers : delegationSet.NameServers.NameServer,
        };
        if ( hostedZone.Config && hostedZone.Config.Comment ) {
            zone.comment = hostedZone.Config.Comment;
        }

        // ToDo: if poll has been given, subscribe to the change

        callback(null, zone);
    });
}

// ----------------------------------------------------------------------------

module.exports = Route53;

// ----------------------------------------------------------------------------
