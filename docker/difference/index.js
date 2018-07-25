var tileReduce = require('./tile-reduce');
var turf = require('@turf/turf');
var bbox = [2.098388671875,50.47848271564207,6.3775634765625,51.645294049305406];
var fs = require('fs');

var args = process.argv.slice(2);

var outputStream = fs.createWriteStream(args[2]);

// If we got more than 3 arguments then we will create a write stream for the stats, buffer & references output streams
var statsOutputStream = undefined;
if(args.length > 3) {
  statsOutputStream = fs.createWriteStream(args[3]);
}

var bufferOutputStream = undefined;
if (args.length > 4) {
  bufferOutputStream = fs.createWriteStream(args[4]);
}

var refOutputStream = undefined;
if (args.length > 5) {
  refOutputStream = fs.createWriteStream(args[5]);
}

// We don't use flanders & groterWechel here
var flanders = {
  "type": "Polygon",
  "coordinates": [
    [
      [
        2.4609375,
        50.68427770577119
      ],
      [
        6.0260009765625,
        50.68427770577119
      ],
      [
        6.0260009765625,
        51.536085601784755
      ],
      [
        2.4609375,
        51.536085601784755
      ],
      [
        2.4609375,
        50.68427770577119
      ]
    ]
  ]
};

var groterWechel = {
  "type": "Polygon",
  "coordinates": [
    [
      [
        4.684295654296875,
        51.20946446493662
      ],
      [
        4.931488037109375,
        51.20946446493662
      ],
      [
        4.931488037109375,
        51.30743796487254
      ],
      [
        4.684295654296875,
        51.30743796487254
      ],
      [
        4.684295654296875,
        51.20946446493662
      ]
    ]
  ]
};


// Here we are taking the inputs that we want to compare to export the issues (issue are the differences between both inputs)
var opts = {
  zoom: 14,
  //geoJson: groterWechel,
  sources: [
    {
      name: 'ref',
      mbtiles: args[1],
      layers: ["roads"]
    },
    {
      name: 'source',
      mbtiles: args[0],
      layers: ["roads"]
    }
  ],
  requireData: 'any',
  map: __dirname + '/difference.js'
};

/* 
  the fourth first boolean values are there to verify if the feature that we want to write in the output is the first one or not
  diff is
  stats is here an array that permits us to collect the total length of roads for the reference data source & the issues that are highlighted after the difference between reference & OSM data source
*/
var firstFeature = true;
var firstBufferFeature = true;
var firstRefFeature = true;
var firstStatFeature = true;
var diff = turf.featureCollection([]);
var stats = {
  total: 0,
  diff:0
};
tileReduce(opts).on('reduce', function(result) {
  // Here we are collecting the different values that we're exporting in the difference.js file 
  if (result.error) {
    console.log(result.error);
    return;
  }

    var type = result.type;
    var diff = result.diffs;
    var buffers = result.buffers;
    var refs = result.refs;
    var localStats = result.stats;
    stats.diff += localStats.diff;
    stats.total += localStats.total;
    // console.log(stats);

    // those loops permits us to write each feature in the right output file
    for (var i = 0; i < diff.features.length; i++) {
      if (!firstFeature) {
        outputStream.write(',');
      }
      firstFeature = false;
      outputStream.write(JSON.stringify(diff.features[i]));
    }

  if (bufferOutputStream && buffers && buffers.features) {
    for (var i = 0; i < buffers.features.length; i++) {
      if (!firstBufferFeature) {
        bufferOutputStream.write(',');
      }
      firstBufferFeature = false;
      bufferOutputStream.write(JSON.stringify(buffers.features[i]));
    }
  }

  if (refOutputStream && refs && refs.features) {
    for (var i = 0; i < refs.features.length; i++) {
      if (!firstRefFeature) {
        refOutputStream.write(',');
      }
      firstRefFeature = false;
      refOutputStream.write(JSON.stringify(refs.features[i]));
    }
  }
})
.on('start', function () {
  // Here we write the head of the geojson file to permit, after that, the writing of features
  outputStream.write('{ "type": "FeatureCollection", "features": [');
  if (bufferOutputStream) {
    bufferOutputStream.write('{ "type": "FeatureCollection", "features": [');
  }

  if (refOutputStream) {
    refOutputStream.write('{ "type": "FeatureCollection", "features": [');
  }
})
.on('error', function(err){
  throw err;
})
.on('end', function() {
  // Here we write the end of the geojson file & we stop all of the output streams
  if (bufferOutputStream) {
    bufferOutputStream.write('] }');
    bufferOutputStream.end();
  }

  if (refOutputStream) {
    refOutputStream.write('] }');
    refOutputStream.end();
  }

  if(statsOutputStream) {
    statsOutputStream.write(JSON.stringify(stats));
    statsOutputStream.end();
  }

  outputStream.write('] }');
  outputStream.end();
});