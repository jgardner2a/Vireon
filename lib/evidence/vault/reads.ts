/**
 * Read-only My Home accessors for vault projection.
 * Do not import set*, persist*, write*, or evidence/persistLinks here.
 */

import {
  listGalleryMedia,
  listIssues,
  listLeases,
  listProperties,
} from "../../myHome/reads";

export const readGalleryMediaForVault = listGalleryMedia;
export const readIssuesForVault = listIssues;
export const readLeasesForVault = listLeases;
export const readPropertiesForVault = listProperties;
