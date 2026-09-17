/**
 * The slice of GeoJSON (RFC 7946) this package reads, declared here rather than pulled
 * from a types package: installing the globe installs nothing but the globe.
 *
 * The shapes match the ones everyone else uses, so a value typed by `@types/geojson`
 * — or by a library that returns GeoJSON — is assignable to these without a cast, and
 * the other way round. `geojson.compat.spec.ts` keeps that true.
 */

/** `[longitude, latitude]`, with an optional third element for elevation. */
export type Position = number[];

/** `[west, south, east, north]`, or the six-element form with elevations. */
export type BBox = [number, number, number, number] | [number, number, number, number, number, number];

export interface GeoJsonObject {
  type: string;
  bbox?: BBox | undefined;
}

export interface Point extends GeoJsonObject {
  type: 'Point';
  coordinates: Position;
}

export interface MultiPoint extends GeoJsonObject {
  type: 'MultiPoint';
  coordinates: Position[];
}

export interface LineString extends GeoJsonObject {
  type: 'LineString';
  coordinates: Position[];
}

export interface MultiLineString extends GeoJsonObject {
  type: 'MultiLineString';
  coordinates: Position[][];
}

/** Outer ring first, then holes. */
export interface Polygon extends GeoJsonObject {
  type: 'Polygon';
  coordinates: Position[][];
}

export interface MultiPolygon extends GeoJsonObject {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}

export interface GeometryCollection<G extends Geometry = Geometry> extends GeoJsonObject {
  type: 'GeometryCollection';
  geometries: G[];
}

export type Geometry = Point | MultiPoint | LineString | MultiLineString | Polygon | MultiPolygon | GeometryCollection;

/* eslint-disable @typescript-eslint/no-explicit-any */
/** `any` rather than `unknown`, so a feature's own property type stays assignable. */
export type GeoJsonProperties = { [name: string]: any } | null;
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface Feature<G extends Geometry | null = Geometry, P = GeoJsonProperties> extends GeoJsonObject {
  type: 'Feature';
  geometry: G;
  id?: string | number | undefined;
  properties: P;
}

export interface FeatureCollection<G extends Geometry | null = Geometry, P = GeoJsonProperties> extends GeoJsonObject {
  type: 'FeatureCollection';
  features: Array<Feature<G, P>>;
}
