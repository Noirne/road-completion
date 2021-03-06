var turf = require('@turf/turf'),
  flatten = require('geojson-flatten'),
  normalize = require('@mapbox/geojson-normalize'),
  tilebelt = require('@mapbox/tilebelt'),
  fs = require('fs'),
  hashF = require('object-hash'),
  fx = require('mkdir-recursive');

module.exports = function(data, tile, writeData, done) {
  var refDeltas = turf.featureCollection([]);
  var streetBuffers = undefined;
  var refRoads = undefined;
  var debugDir = "/home/xivk/work/osmbe/road-completion/debug/";
  if (!fs.existsSync(debugDir)) {
    debugDir = undefined;
  }

  try {
    if (tile[2] == 14)
    {
      var tileDir = tile[2] + "/" + tile[0] + "/";
      var tileName = tile[1] + ".geojson";
      var osmDataDir = debugDir + "osmdata/" + tileDir;
      var refRoadsDir = debugDir + "refroads/" + tileDir;
      var osmBuffersDir = debugDir + "osmbuffers/" + tileDir;
      var diffsDir = debugDir + "diffs/" + tileDir;
      if (debugDir) {
        if (!fs.existsSync(osmDataDir)){
          fx.mkdirSync(osmDataDir);
        }
        if (!fs.existsSync(refRoadsDir)){
          fx.mkdirSync(refRoadsDir);
        }
        if (!fs.existsSync(osmBuffersDir)){
          fx.mkdirSync(osmBuffersDir);
        }
        if (!fs.existsSync(diffsDir)){
          fx.mkdirSync(diffsDir);
        }
      }
      
      // concat feature classes and normalize data
      refRoads = normalize(data.ref.roads);
      if (data.source) {
        var osmData = normalize(data.source.roads);

        if (debugDir) {
          fs.writeFile (osmDataDir + tileName, JSON.stringify(osmData));
          fs.writeFile (refRoadsDir + tileName, JSON.stringify(refRoads));
        }

        osmData = flatten(osmData);
        refRoads = flatten(refRoads);
        
        refRoads.features.forEach(function(road, i) {
          if (filter(road)) refRoads.features.splice(i,1);
        });

        // buffer streets
        streetBuffers = osmData.features.map(function(f){
          var buffer = turf.buffer(f.geometry, 20, 'meters');
          if (buffer) return buffer;
        });

        var merged = streetBuffers[0];
        for (var i = 1; i < streetBuffers.length; i++) {
          merged = turf.union(merged, streetBuffers[i]);
        }

        merged = turf.simplify(merged, 0.00001, false);
        streetBuffers = normalize(merged);

        if (debugDir) {
          fs.writeFile (osmBuffersDir + tileName, JSON.stringify(merged));
        }

        if (refRoads && streetBuffers) {
          refRoads.features.forEach(function(refRoad){
            streetBuffers.features.forEach(function(streetsRoad){
                var roadDiff = turf.difference(refRoad, streetsRoad);
                if(roadDiff && !filter(roadDiff)) refDeltas.features.push(roadDiff);
            });
          });
        }
      } else {
        refDeltas = refRoads;
      }

      // add hashes as id's and tile-id's.
      for (var f = 0; f < refDeltas.features.length; f++) {
        var feature = refDeltas.features[f];
        if (feature &&
            feature.geometry) {
          var hash = hashF(feature.geometry);

          feature.properties.id = "" + hash;
          feature.properties.tile_z = tile[2];
          feature.properties.tile_x = tile[0];
          feature.properties.tile_y = tile[1];
        }
      }

      if (debugDir) {
        fs.writeFile (diffsDir + tileName, JSON.stringify(normalize(refDeltas)));
      }
    }
  }
  catch (e)
  {
    console.log("Could not process tile " + tileName + ": " + e.message);
  }

  done(null, { 
    diffs: refDeltas,
    buffers: streetBuffers,
    refs: refRoads,
    osm: osmData
   });
};

function clip(lines, tile) {
  lines.features = lines.features.map(function(line){
    try {
      var clipped = turf.intersect(line, turf.polygon(tilebelt.tileToGeoJSON(tile).coordinates));
      return clipped;
    } catch(e){
      return;
    }
  });
  lines.features = lines.features.filter(function(line){
    if(line) return true;
  });
  lines.features = lines.features.filter(function(line){
    if(line.geometry.type === 'LineString' || line.geometry.type === 'MultiLineString') return true;
  });
  return lines;
}

function filter(road) {
  var length = turf.lineDistance(road, 'kilometers');
  if (length < 0.03 || road.properties.fullname == '') {
    return true;
  } else {
    return false;
  }
}
