// ----------------------------------------------------------------------------
//
// nice-route53.js
//
// Copyright (c) 2013 Mozilla Corporation.
//
// ----------------------------------------------------------------------------

// core
var events = require('events');

// npm
var AWS = require('aws-sdk');
// ----------------------------------------------------------------------------
// internal functions

function extractZoneId(id) {
    var m = id.match(/\/([^\/]+)$/);
    return m[1];
}

function extractChangeId(id) {
    return id.match(/^\/change\/(.+)$/)[1];
}

function removeTrailingDotFromDomain(domain) {
    if ( domain.match(/\.$/) ) {
        return domain.substr(0, domain.length - 1 );
    }
    return domain;
}

function addTrailingDotToDomain(domain) {
    if ( domain.match(/\.$/) ) {
        return domain;
    }
    return domain + '.';
}

function decodeAsterisk(str) {
    return str.replace("\\052", "*");
}

function convertListHostedZonesResponse(response) {
    // the list to return
    var zones = [];

    // if this response only has one item, then it'll be an object, not an array
    if ( Object.prototype.toString.call(response) === '[object Object]' ) {
        response = [ response ];
    }
    if ( !response ) {
      response = [];
    }

    response.forEach(function(zone) {
        zones.push({
            zoneId    : extractZoneId(zone.Id),
            name      : zone.Name.substr(0, zone.Name.length-1),
            reference : zone.CallerReference,
            comment   : zone.Config && zone.Config.Comment,
        });
    });

    return zones;
}

function convertGetHostedZoneResponseToZoneInfo(response) {
    var hostedZone = response.HostedZone;

    var zone = {
        zoneId      : extractZoneId(hostedZone.Id),
        name        : hostedZone.Name.substr(0, hostedZone.Name.length-1),
        reference   : hostedZone.CallerReference,
    };

    if ( response.ChangeInfo ) {
        zone.status      = response.ChangeInfo.Status;
        zone.submittedAt = response.ChangeInfo.SubmittedAt;
        zone.changeId    = extractChangeId(response.ChangeInfo.Id);
    }

    if ( response.DelegationSet ) {
        zone.nameServers = response.DelegationSet.NameServers;
    }

    if ( hostedZone.Config && hostedZone.Config.Comment ) {
        zone.comment = hostedZone.Config.Comment;
    }

    return zone;
}

function convertListResourceRecordSetsResponseToRecords(response) {
    var recordSets = response.ResourceRecordSets;

    if ( !Array.isArray(recordSets) ) {
        recordSets = [ recordSets ];
    }

    var records = [];
    recordSets.forEach(function(recordSet) {
        var record = {
            name          : removeTrailingDotFromDomain(recordSet.Name),
            type          : recordSet.Type,
            ttl           : recordSet.TTL,
            setIdentifier : recordSet.SetIdentifier,
            weight        : recordSet.Weight,
        };

        // if there are no resource records, then this might be an Alias!
        if ( !recordSet.ResourceRecords ) return;

        // check the resourceRecords we have
        var resourceRecords = recordSet.ResourceRecords;
        if ( !Array.isArray(resourceRecords) ) {
            resourceRecords = [ resourceRecords ];
        }
        record.values = resourceRecords.map(function(rr) {
            return rr.Value;
        });

        records.push(record);
    });

    return records;
}

function convertChangeResourceRecordSetsResponseToChangeInfo(response) {
    var changeInfo = response.ChangeInfo;

    return {
        changeId    : extractChangeId(changeInfo.Id),
        url         : changeInfo.Id,
        status      : changeInfo.Status,
        submittedAt : changeInfo.SubmittedAt,
    };
}

function convertGetChangeResponseToChangeInfo(response) {
    var changeInfo = response.ChangeInfo;

    return {
        changeId    : extractChangeId(changeInfo.Id),
        url         : changeInfo.Id,
        status      : changeInfo.Status,
        submittedAt : changeInfo.SubmittedAt,
    };
}

function makeError(err) {
    return {
        type : err.code,
        code : err.statusCode,
        msg  : err.message
    };
}

// ----------------------------------------------------------------------------
// the external API

function Route53(opts) {
    var self = this;

    // create a client
    self.client = new AWS.Route53(opts)
    return self;
}

Route53.prototype.zones = function(callback) {
    var self = this;
    // save the zones somewhere
    var zones = [];

    function listHostedZones(nextMarker, next) {
        var args = {};
        if ( nextMarker ) {
            args.Marker = nextMarker;
        }
        self.client.listHostedZones(args, function(err, response) {
            if (err) return callback(makeError(err));

            // shortcut to the real response and save the zones
            var hostedZones = response.HostedZones;
            zones = zones.concat(convertListHostedZonesResponse(hostedZones));

            // if this response contains IsTruncated, then we need to re-query
            if ( response.IsTruncated === true ) {
                return listHostedZones(response.NextMarker, next);
            }

            next(null, zones);
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
        input = removeTrailingDotFromDomain(input);
        self.zones(function(err, zones) {
            if (err) return callback(err);

            var found = false;
            zones.forEach(function(zone) {
                // if we find this domain name, then call zoneInfo() with the zoneId
                if ( zone.name === input ) {
                    found = true;
                    self.zoneInfo(zone.zoneId, callback);
                }
            });
            if ( !found ) {
                return callback({
                    type : 'NiceRoute53-Client',
                    code : 'DomainNotFound',
                    msg  : 'The domain name/zoneId you specified was not found.',
                });
            }
        });
    }
    else {
        // looks like a zoneId, so just call GetHostedZone
        self.client.getHostedZone({ Id : input }, function(err, response) {
            if (err) return callback(makeError(err));

            var zoneInfo = convertGetHostedZoneResponseToZoneInfo(response);
            callback(null, zoneInfo);
        });
    }
};

Route53.prototype.createZone = function(args, pollEvery, callback) {
    var self = this;

    // see if the user wants to poll for status completion
    if ( typeof pollEvery === 'function' ) {
        callback = pollEvery;
        pollEvery = undefined;
    }

    var realArgs = {
        Name            : args.name,
        CallerReference : args.reference || args.name,
    };

    if ( args.comment ) {
        realArgs.HostedZoneConfig = {
            Comment: args.comment
        };
    }
    self.client.createHostedZone(realArgs, function(err, response) {
        if (err) {
            err = makeError(err);
            return callback(err);
        }

        var hostedZone = response.HostedZone;
        var changeInfo = response.ChangeInfo;
        var delegationSet = response.DelegationSet;
        var zone = {
            zoneId      : extractZoneId(hostedZone.Id),
            name        : hostedZone.Name.substr(0, hostedZone.Name.length-1),
            reference   : hostedZone.CallerReference,
            status      : changeInfo.Status,
            submittedAt : changeInfo.SubmittedAt,
            changeId    : extractChangeId(changeInfo.Id),
            nameServers : delegationSet.NameServers,
        };
        if ( hostedZone.Config && hostedZone.Config.Comment ) {
            zone.comment = hostedZone.Config.Comment;
        }

        // if we want to poll for when this change is INSYNC, do it now
        var ee;
        if ( pollEvery ) {
            ee = self.pollChangeUntilInSync(zone.changeId, pollEvery);
        }
        callback(null, zone, ee);
    });
};

Route53.prototype.records = function(zoneId, callback) {
    var self = this;

    // zoneId may be a domain name or a zoneId
    self.zoneInfo(zoneId, function(err, zoneInfo) {
        if (err) return callback(err);

        // create the args
        var args = {
            HostedZoneId : zoneInfo.zoneId,
        };

        // save the records somewhere
        var records = [];

        function listResourceRecords(nextName, nextType, nextIdentifier, callback) {
            if ( nextName ) {
                args.StartRecordType = nextType;
                args.StartRecordName = nextName;
                if ( nextIdentifier ) {
                    args.StartRecordIdentifier = nextIdentifier;
                }
            }
            // get the records
            self.client.listResourceRecordSets(args, function(err, response) {
                if (err) return callback(makeError(err));

                // add these records onto the list
                var newRecords = convertListResourceRecordSetsResponseToRecords(response);
                records = records.concat(newRecords);
                // if this response contains IsTruncated, then we need to re-query
                if ( response.IsTruncated === true ) {

                    return listResourceRecords(
                        response.NextRecordName,
                        response.NextRecordType,
                        response.NextRecordIdentifier,
                        callback
                    );
                }
                callback(null, records);
            });
        }

        // start this operation
        listResourceRecords(null, null, null, callback);
    });
};

Route53.prototype.setRecord = function(opts, pollEvery, callback) {
    var self = this;

    // see if the user wants to poll for status completion
    if ( typeof pollEvery === 'function' ) {
        callback = pollEvery;
        pollEvery = undefined;
    }

    // ToDo: check that we have been given a 'zoneId', 'name', 'type', 'ttl' and 'values'.

    // make sure the name has a trailing dot
    opts.name = addTrailingDotToDomain(opts.name);

    // create the args (Changes will be added once we know whether this record will be deleted first)
    var args = {
        HostedZoneId : opts.zoneId,
        ChangeBatch : {
            Changes: [],
        }
    };
    if ( opts.comment ) {
        args.Comment = opts.comment;
    }

    // pull out all of the records
    self.records(opts.zoneId, function(err, records) {
        if (err) return callback(err);
        // loop through the records finding the one we want (if any)
        records.forEach(function(record) {
            if ( decodeAsterisk(opts.name) === addTrailingDotToDomain(decodeAsterisk(record.name)) && opts.type === record.type ) {
                args.ChangeBatch.Changes.push({
                    Action : 'DELETE',
                    ResourceRecordSet: {
                        Name          : record.name,
                        Type          : record.type,
                        TTL           : record.ttl,
                        SetIdentifier : record.setIdentifier,
                        Weight        : record.weight,
                        ResourceRecords : record.values.map(function(r) {
                            return {
                                Value: r
                            }
                        })
                    }
                });
            }
        });

        // now add the new record
        var change = {
            Action : 'CREATE',
            ResourceRecordSet: {
                Name   : opts.name,
                Type   : opts.type,
                TTL    : opts.ttl,
            }
        };


        if ( opts.setIdentifier ) {
            change
                .ResourceRecordSet
                    .SetIdentifier = opts.setIdentifier;
        }

        if ( opts.weight ) {
            change
                .ResourceRecordSet
                    .Weight = opts.weight;
        }

        if (opts.values) {
            change
                .ResourceRecordSet
                    .ResourceRecords = opts.values.map(function(r) {
                        return {
                            Value: r
                        }
                    });
        } else if (opts.alias) {
            delete change.ResourceRecordSet.TTL;
            change
                .ResourceRecordSet
                    .AliasTarget = opts.alias;
        }
        args.ChangeBatch.Changes.push(change);

        // send this changeset to Route53
        self.client.changeResourceRecordSets(args, function(err, result) {
            if (err) return callback(makeError(err));

            var changeInfo = convertChangeResourceRecordSetsResponseToChangeInfo(result);

            // if we want to poll for when this change is INSYNC, do it now
            var ee;
            if ( pollEvery ) {
                ee = self.pollChangeUntilInSync(changeInfo.changeId, pollEvery);
            }

            callback(null, changeInfo, ee);
        });
    });
};

Route53.prototype.upsertRecord = function(opts, pollEvery, callback) {
    var self = this;

    // see if the user wants to poll for status completion
    if ( typeof pollEvery === 'function' ) {
        callback = pollEvery;
        pollEvery = undefined;
    }

    // ToDo: check that we have been given a 'zoneId', 'name', 'type', 'ttl' and 'values'.

    // make sure the name has a trailing dot
    opts.name = addTrailingDotToDomain(opts.name);

    // create the args (Changes will be added once we know whether this record will be deleted first)
    var args = {
        HostedZoneId : opts.zoneId,
        ChangeBatch : {
            Changes: [],
        }
    };
    if ( opts.comment ) {
        args.Comment = opts.comment;
    }

    // now upsert the record
    var change = {
        Action : 'UPSERT',
        ResourceRecordSet: {
            Name   : opts.name,
            Type   : opts.type,
            TTL    : opts.ttl,
        }
    };

    if ( opts.setIdentifier ) {
        change.ResourceRecordSet.SetIdentifier = opts.setIdentifier;
    }

    if ( opts.weight ) {
        change.ResourceRecordSet.Weight = opts.weight;
    }

    if (opts.values) {
        change.ResourceRecordSet.ResourceRecords = opts.values.map(function(r) {
          return {
            Value: r
          }
        });
    }
    args.ChangeBatch.Changes.push(change);

    // send this changeset to Route53
    self.client.changeResourceRecordSets(args, function(err, result) {
        if (err) return callback(makeError(err));

        var changeInfo = convertChangeResourceRecordSetsResponseToChangeInfo(result);

        // if we want to poll for when this change is INSYNC, do it now
        var ee;
        if ( pollEvery ) {
            ee = self.pollChangeUntilInSync(changeInfo.changeId, pollEvery);
        }

        callback(null, changeInfo, ee);
    });
};

Route53.prototype.delRecord = function(opts, pollEvery, callback) {
    var self = this;

    // see if the user wants to poll for status completion
    if ( typeof pollEvery === 'function' ) {
        callback = pollEvery;
        pollEvery = undefined;
    }

    // ToDo: check that we have been given a 'zoneId', 'name' and 'type'

    // make sure the name has a trailing dot
    opts.name = removeTrailingDotFromDomain(opts.name);

    // create the args (Changes will be added once we know whether this record will be deleted first)
    var args = {
        HostedZoneId : opts.zoneId,
        ChangeBatch : {
            Changes: [],
        }
    };

    // pull out all of the records
    self.records(opts.zoneId, function(err, records) {
        if (err) return callback(err);
        // loop through the records finding the one we want (if any)
        records.forEach(function(record) {
            if ( opts.name === record.name && opts.type === record.type &&
                 ( ! opts.setIdentifier || opts.setIdentifier === record.setIdentifier ) ) {
                args.ChangeBatch.Changes.push({
                    Action : 'DELETE',
                    ResourceRecordSet: {
                        Name          : record.name,
                        Type          : record.type,
                        TTL           : record.ttl,
                        SetIdentifier : record.setIdentifier,
                        Weight        : record.weight,
                        ResourceRecords : record.values.map(function(r) {
                            return {
                                Value: r
                            }
                        })
                    }
                });
            }
        });

        // check that we found a record to delete
        if ( args.ChangeBatch.Changes.length === 0 ) {
            return callback({
                type : 'NiceRoute53-Client',
                code : 'RecordNotFound',
                msg  : 'The record you asked to delete could not be found.',
            });
        }

        // send this changeset to Route53
        self.client.changeResourceRecordSets(args, function(err, result) {
            if (err) return callback(makeError(err));

            var changeInfo = convertChangeResourceRecordSetsResponseToChangeInfo(result);

            // if we want to poll for when this change is INSYNC, do it now
            var ee;
            if ( pollEvery ) {
                ee = self.pollChangeUntilInSync(changeInfo.changeId, pollEvery);
            }

            callback(null, changeInfo, ee);
        });
    });
};

Route53.prototype.getChange = function(changeId, callback) {
    var self = this;

    self.client.getChange({ Id : changeId }, function(err, result) {
        if (err) return callback(makeError(err));

        var response = convertGetChangeResponseToChangeInfo(result);
        callback(null, response);
    });
};

// the EventEmitter that is returned can emit 'attempt', 'pending', 'insync' and 'error'
Route53.prototype.pollChangeUntilInSync = function(changeId, pollEvery) {
    var self = this;

    // firstly, create an event emitter
    var ee = new events.EventEmitter();

    // poll for the change
    function poll() {
        self.getChange(changeId, function(err, changeInfo) {
            if (err) {
                return ee.emit('error', err);
            }

            ee.emit('attempt', changeInfo);

            if ( changeInfo.status === 'PENDING' ) {
                ee.emit('pending', changeInfo);
                setTimeout(poll, pollEvery * 1000);
            }
            else if ( changeInfo.status === 'INSYNC' ) {
                ee.emit('insync', changeInfo);
            }
            else {
                ee.emit('error', changeInfo);
            }
        });
    }

    // start it off
    poll();

    return ee;
};

// ----------------------------------------------------------------------------

module.exports = Route53;

// ----------------------------------------------------------------------------
