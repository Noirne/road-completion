#!/bin/sh
# this downloads and converts the wegenregister data to a format that can be used by tippecanoe and tile-reduce.

# https//overheid.vlaanderen.be/wegenregister-stand-van-zaken
# https://download.agiv.be/Producten/Detail?id=3810&title=Wegenregister_22_06_2017
# get wegenregister if not present
# IMPORTANT: it's possible the URL just changes, horrible right? nothing we can do about it.
#if [ ! -d ./Wegenregister_SHAPE_20180621 ]; then
#wget -O ./Wegenregister_SHAPE_20180621.zip https://downloadagiv.blob.core.windows.net/wegenregister/Wegenregister_SHAPE_20180621.zip
#unzip ./Wegenregister_SHAPE_20180621.zip -d ./
#fi

STREET_AXIS="UrbAdm_STREET_AXIS"
STREET_LEVEL0="UrbAdm_STREET_SURFACE_LEVEL0"

# Download data from urbis
wget -O UrbAdm.zip https://s.irisnet.be/v1/AUTH_ce3f7c74-fbd7-4b46-8d85-53d10d86904f/UrbAdm/UrbAdm_SHP.zip
unzip -o UrbAdm.zip -d ./

# Enter Urbis data directory
cd shp

#convert wegenregister to geojson
if [ ! -f ./$STREET_AXIS.geojson ]; then
ogr2ogr --config SHAPE_ENCODING "ISO-8859-1" -f "GeoJSON" -s_srs "EPSG:31370" -t_srs "EPSG:4326" -progress ./$STREET_AXIS.geojson ./$STREET_LEVEL0.shp
fi

if [ ! -f ./UrbAdm_STREET_SURFACE_LEVEL_MINUS1.geojson ]; then
ogr2ogr --config SHAPE_ENCODING "ISO-8859-1" -f "GeoJSON" -s_srs "EPSG:31370" -t_srs "EPSG:4326" -progress ./UrbAdm_STREET_SURFACE_LEVEL_MINUS1.geojson ./UrbAdm_STREET_SURFACE_LEVEL_MINUS1.shp
fi

if [ ! -f ./UrbAdm_STREET_SURFACE_LEVEL_PLUS1.geojson ]; then
ogr2ogr --config SHAPE_ENCODING "ISO-8859-1" -f "GeoJSON" -s_srs "EPSG:31370" -t_srs "EPSG:4326" -progress ./UrbAdm_STREET_SURFACE_LEVEL_PLUS1.geojson ./UrbAdm_STREET_SURFACE_LEVEL_PLUS1.shp
fi

if [ ! -f ./UrbAdm_STREET_ROADS_LENGTH.geojson ]; then
ogr2ogr --config SHAPE_ENCODING "ISO-8859-1" -f "GeoJSON" -s_srs "EPSG:31370" -t_srs "EPSG:4326" -progress ./UrbAdm_STREET_ROADS_LENGTH.geojson ./UrbAdm_STREET_AXIS.shp
fi

#convert to OSM-tags
#node process.js ./wegsegment.geojson ./wegsegment-transformed.geojson

cp ./UrbAdm_STREET_AXIS.geojson ../../../sharedfolder
cp ./UrbAdm_STREET_SURFACE_LEVEL_PLUS1.geojson ../../../sharedfolder
cp ./UrbAdm_STREET_SURFACE_LEVEL_MINUS1.geojson ../../../sharedfolder
cp ./UrbAdm_STREET_ROADS_LENGTH.geojson ../../../sharedfolder
rm -rf UrbAdm_STREET_AXIS.* 
rm -rf UrbAdm_STREET_SURFACE_LEVEL_MINUS1.* 
rm -rf UrbAdm_STREET_SURFACE_LEVEL_PLUS1.* 
rm -rf UrbAdm_STREET_ROADS_LENGTH.*
#convert to vectortiles
# TODO: test with zoom-level limits, we only need level 14.
#tippecanoe -f -o ./wegenregister.mbtiles ./wegsegment.geojson -l roads -pf -pk

