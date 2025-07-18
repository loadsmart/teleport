/**
 * Teleport
 * Copyright (C) 2024 Gravitational, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

export const zIndexMap = {
  // "checkoutSidePanel" z-index must be a higher value than "topBar" z-index.
  // checkoutSidePanel encompasses entire height of the browser and
  // the high z-index prevents navigational bits from rendering over
  // the panel.
  checkoutSidePanel: 100,
  topBar: 19,
  sideNavButtons: 18,
  sideNavContainer: 17,
  sideNavExpandedPanel: 16,
  infoGuideSidePanel: 15,
};
