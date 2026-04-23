import { getDb } from "@/lib/db/dexie";
import { SYNC_ACTION_TYPE } from "@/lib/constants";
import type { Coordinate } from "@/types";
import { createEntityAtoms } from "./createEntityAtoms";

const {
  dataAtom: coordinatesAtom,
  refreshAtom: refreshCoordinatesAtom,
  addAtom: addCoordinateAtom,
  updateAtom: updateCoordinateAtom,
  deleteAtom: deleteCoordinateAtom,
} = createEntityAtoms<Coordinate>(() => getDb().coordinates, {
  create: SYNC_ACTION_TYPE.COORDINATE_CREATE,
  update: SYNC_ACTION_TYPE.COORDINATE_UPDATE,
  delete: SYNC_ACTION_TYPE.COORDINATE_DELETE,
});

export {
  coordinatesAtom,
  refreshCoordinatesAtom,
  addCoordinateAtom,
  updateCoordinateAtom,
  deleteCoordinateAtom,
};
