import { LIMITS, VEHICLES, distanceLabel } from './jejak-model.js';

export const SCENE_VIEWBOX = '24 106 772 404';

const LANE_COUNT = 7;
const LANE_ORIGIN_Y = 404;
const LANE_GAP = 16;
const ROUTE_START_X = 60;
const ROUTE_SPAN = 700;
const ROUTE_MIN_SHARE = 0.2;

const GLYPH_VIEWBOX = {
  car: '56 132 720 226',
  motorcycle: '176 116 470 244',
  bus: '26 148 764 208',
  train: '18 148 780 208',
  bicycle: '206 108 404 248',
  walking: '316 126 190 232',
};

let sceneCounter = 0;

function fixed(value) {
  return Math.round(value * 10) / 10;
}

function spokes(cx, cy, inner, outer, count = 5, fine = false) {
  const className = fine ? 'jv-spoke jv-spoke--fine' : 'jv-spoke';
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    const x1 = fixed(cx + Math.cos(angle) * inner);
    const y1 = fixed(cy + Math.sin(angle) * inner);
    const x2 = fixed(cx + Math.cos(angle) * outer);
    const y2 = fixed(cy + Math.sin(angle) * outer);
    return `<line class="${className}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }).join('');
}

function wheel({ cx, cy, tire, rim, hub, spokeIn, spokeOut, count = 5, ring = false }) {
  const tireClass = ring ? 'jv-tire jv-tire--ring' : 'jv-tire';
  return `<g class="jv-wheel"><circle class="${tireClass}" cx="${cx}" cy="${cy}" r="${tire}"/><circle class="jv-rim" cx="${cx}" cy="${cy}" r="${rim}"/>${spokes(cx, cy, spokeIn, spokeOut, count, ring)}<circle class="jv-hub" cx="${cx}" cy="${cy}" r="${hub}"/></g>`;
}

function bust(x, y, index, radius = 11) {
  const half = radius + 10;
  const top = radius + 4;
  const side = radius + 21;
  return `<g transform="translate(${x} ${y})"><g class="jv-p" data-seat="${index}"><circle class="jv-person" r="${radius}"/><path class="jv-person" d="M${-half} 48V${side}Q${-half} ${top + 2} -9 ${top}H9Q${half} ${top + 2} ${half} ${side}V48Z"/></g></g>`;
}

function plusBadge(x, y, index) {
  return `<g transform="translate(${x} ${y})"><g class="jv-p jv-p--plus" data-seat="${index}"><rect class="jv-plus-pill" x="-19" y="-12" width="38" height="24" rx="12"/><text class="jv-plus-text" y="5" text-anchor="middle">5+</text></g></g>`;
}

function carArt(uid) {
  const glassRear = 'M212 214L270 160H370V214Z';
  const glassFront = 'M384 160H458L516 214H384Z';
  const seats = [454, 410, 334, 282];
  return {
    defs: `<mask id="${uid}-car-arch" maskUnits="userSpaceOnUse" x="0" y="0" width="820" height="470"><rect width="820" height="470" fill="#fff"/><circle cx="205" cy="306" r="56" fill="#000"/><circle cx="545" cy="306" r="56" fill="#000"/></mask><clipPath id="${uid}-car-glass"><path d="${glassRear}"/><path d="${glassFront}"/></clipPath>`,
    markup: `<path class="jv-body" d="M70 306V250Q70 232 88 228L190 222L262 152Q270 142 284 142H452Q470 142 482 154L552 224L716 238Q760 244 762 278V306Z" mask="url(#${uid}-car-arch)"/><path class="jv-arch" d="M149 306A56 56 0 0 1 261 306M489 306A56 56 0 0 1 601 306"/><path class="jv-glass" d="${glassRear}"/><path class="jv-glass" d="${glassFront}"/><g clip-path="url(#${uid}-car-glass)">${seats.map((x, index) => bust(x, 186, index)).join('')}</g><path class="jv-detail" d="M377 160V226"/><path class="jv-accent" d="M84 262H166M244 262H506M584 262H752"/><path class="jv-handle" d="M396 236H420"/><rect class="jv-lamp jv-lamp--rear" x="66" y="238" width="9" height="16" rx="3"/><rect class="jv-lamp" x="742" y="250" width="14" height="9" rx="3"/>${wheel({ cx: 205, cy: 306, tire: 44, rim: 27, hub: 8, spokeIn: 10, spokeOut: 25 })}${wheel({ cx: 545, cy: 306, tire: 44, rim: 27, hub: 8, spokeIn: 10, spokeOut: 25 })}`,
    puff: { x: 58, y: 300 },
  };
}

function busArt(uid) {
  const windowXs = [64, 152, 240, 328, 416, 504];
  const windows = windowXs.map((x) => `M${x} 184H${x + 76}V246H${x}Z`).join('');
  const windshield = 'M684 184H738Q752 184 756 198L768 246H684Z';
  const seatOrder = [1, 2, 3, 4, 0];
  const busts = seatOrder.map((windowIndex, seat) => bust(windowXs[windowIndex] + 38, 208, seat, 11)).join('');
  return {
    defs: `<mask id="${uid}-bus-arch" maskUnits="userSpaceOnUse" x="0" y="0" width="820" height="470"><rect width="820" height="470" fill="#fff"/><circle cx="190" cy="310" r="52" fill="#000"/><circle cx="610" cy="310" r="52" fill="#000"/></mask><clipPath id="${uid}-bus-glass"><path d="${windows}"/></clipPath>`,
    markup: `<path class="jv-body" d="M40 338V190Q40 160 70 160H728Q760 160 768 192L780 274V338Z" mask="url(#${uid}-bus-arch)"/><path class="jv-arch" d="M138 310A52 52 0 0 1 242 310M558 310A52 52 0 0 1 662 310"/><path class="jv-glass" d="${windows}"/><path class="jv-glass" d="${windshield}"/><g clip-path="url(#${uid}-bus-glass)">${busts}</g>${plusBadge(windowXs[5] + 38, 215, 5)}<path class="jv-detail" d="M596 178H672V338H596Z"/><path class="jv-detail" d="M634 178V338"/><path class="jv-glass" d="M602 184H630V246H602ZM638 184H666V246H638Z"/><path class="jv-accent" d="M52 274H130M250 274H550M670 274H768"/><rect class="jv-lamp jv-lamp--rear" x="36" y="296" width="8" height="16" rx="3"/><rect class="jv-lamp" x="764" y="290" width="12" height="10" rx="3"/>${wheel({ cx: 190, cy: 310, tire: 40, rim: 25, hub: 7, spokeIn: 9, spokeOut: 23 })}${wheel({ cx: 610, cy: 310, tire: 40, rim: 25, hub: 7, spokeIn: 9, spokeOut: 23 })}`,
    puff: { x: 34, y: 308 },
  };
}

function trainArt(uid) {
  const windowXs = [56, 132, 208, 372, 448, 524];
  const windows = windowXs.map((x) => `M${x} 184H${x + 64}V246H${x}Z`).join('');
  const cab = 'M684 184H728Q742 184 750 200L772 246H684Z';
  const seatOrder = [1, 2, 4, 5, 0];
  const busts = seatOrder.map((windowIndex, seat) => bust(windowXs[windowIndex] + 32, 208, seat, 11)).join('');
  const wheels = [110, 190, 610, 690].map((cx) => wheel({ cx, cy: 326, tire: 24, rim: 14, hub: 5, spokeIn: 5, spokeOut: 12, count: 4 })).join('');
  return {
    defs: `<clipPath id="${uid}-train-glass"><path d="${windows}"/></clipPath>`,
    markup: `<path class="jv-line" d="M372 160L392 138H452L472 160M384 138H460" stroke-width="3"/><path class="jv-body" d="M30 318V190Q30 160 62 160H694Q748 160 782 236L790 318Z"/><path class="jv-glass" d="${windows}"/><path class="jv-glass" d="${cab}"/><g clip-path="url(#${uid}-train-glass)">${busts}</g>${plusBadge(404, 215, 5)}<path class="jv-detail" d="M296 176H356V318H296Z"/><path class="jv-detail" d="M326 176V318"/><path class="jv-detail" d="M612 176H672V318H612Z"/><path class="jv-detail" d="M642 176V318"/><path class="jv-accent" d="M44 276H780"/><path class="jv-detail" d="M250 326H560"/><rect class="jv-lamp" x="778" y="278" width="10" height="16" rx="3"/>${wheels}<path class="jv-line jv-line--thin" d="M84 350H216M584 350H716"/>`,
    puff: null,
  };
}

function motorcycleArt(uid) {
  return {
    defs: `<mask id="${uid}-moto-arch" maskUnits="userSpaceOnUse" x="0" y="0" width="820" height="470"><rect width="820" height="470" fill="#fff"/><circle cx="235" cy="306" r="53" fill="#000"/><circle cx="575" cy="306" r="53" fill="#000"/></mask>`,
    markup: `<path class="jv-line" d="M506 258L575 306M506 258L494 206M494 206L518 200M336 318L235 306" stroke-width="8"/><path class="jv-body" d="M196 262Q194 246 212 244L350 236Q384 234 402 222L448 216Q476 216 490 234L508 262L482 272L452 298L446 322L336 326L300 306L262 300Q198 296 196 262Z" mask="url(#${uid}-moto-arch)"/><path class="jv-detail" d="M356 300H426M356 312H426"/><path class="jv-line" d="M534 284Q578 258 618 280" stroke-width="7"/><path class="jv-accent" d="M222 258H344"/><rect class="jv-lamp jv-lamp--rear" x="192" y="240" width="7" height="13" rx="3"/><rect class="jv-lamp" x="512" y="230" width="12" height="18" rx="4"/><g class="jv-p" data-seat="1"><g class="jv-rider"><circle class="jv-person" cx="252" cy="160" r="13"/><path class="jv-limb" d="M262 230L255 186" stroke-width="19"/><path class="jv-limb" d="M258 192L300 206L322 220" stroke-width="8"/><path class="jv-limb" d="M264 232L320 258L316 302" stroke-width="10"/></g></g><g class="jv-p" data-seat="0"><g class="jv-rider"><circle class="jv-person" cx="388" cy="158" r="14"/><path class="jv-limb" d="M338 228L374 182" stroke-width="19"/><path class="jv-limb" d="M376 188L434 204L494 208" stroke-width="8"/><path class="jv-limb" d="M338 230L408 256L398 304" stroke-width="11"/></g></g>${wheel({ cx: 235, cy: 306, tire: 44, rim: 27, hub: 8, spokeIn: 10, spokeOut: 25 })}${wheel({ cx: 575, cy: 306, tire: 44, rim: 27, hub: 8, spokeIn: 10, spokeOut: 25 })}`,
    puff: { x: 190, y: 300 },
  };
}

function bicycleArt() {
  return {
    defs: '',
    markup: `<path class="jv-line" d="M270 308L338 226M270 308L400 308M338 226L400 308M338 226L492 222M400 308L500 246M492 222L500 246M500 246L560 308" stroke-width="6"/><path class="jv-accent" d="M348 226H486"/><path class="jv-line" d="M492 222L484 200M484 200L512 196M312 218H358M338 226V218" stroke-width="7"/><circle class="jv-ring" cx="400" cy="308" r="12"/><path class="jv-line jv-line--thin" d="M400 308L392 328M384 330H402" stroke-width="5"/><g class="jv-p" data-seat="0"><g class="jv-rider"><path class="jv-limb" d="M349 212L366 254L410 298" stroke-width="11" opacity=".6"/>
      <path class="jv-limb" d="M390 172L438 193L496 196" stroke-width="8" opacity=".6"/>
      <path class="jv-cyclist-shirt" d="M337 203L392 158Q402 155 409 170L366 214L349 222Z"/>
      <path class="jv-limb" d="M400 172L449 194L510 196" stroke-width="8"/>
      <path class="jv-limb" d="M342 214L408 251L394 322" stroke-width="11"/>
      <path class="jv-person" d="M399 157L408 141L418 147L410 164Z"/>
      <circle class="jv-person" cx="414" cy="134" r="14"/>
      <path class="jv-person" d="M426 133L435 140L426 145Z"/>
      <path class="jv-walk-hair" d="M399 132Q397 115 413 114Q431 114 431 132L420 125L414 132Z"/>
      <path class="jv-line" d="M386 325H404" stroke-width="5"/></g></g>${wheel({ cx: 270, cy: 308, tire: 42, rim: 36, hub: 5, spokeIn: 6, spokeOut: 36, count: 10, ring: true })}${wheel({ cx: 560, cy: 308, tire: 42, rim: 36, hub: 5, spokeIn: 6, spokeOut: 36, count: 10, ring: true })}`,
    puff: null,
  };
}

function walkingArt() {
  return {
    defs: '',
    markup: `<g class="jv-p" data-seat="0"><g class="jv-rider">
      <g class="jv-walk-arm jv-walk-arm--far"><path class="jv-limb" d="M410 205L421 230L414 248" stroke-width="9"/></g>
      <g class="jv-walk-leg jv-walk-leg--far"><path class="jv-limb" d="M410 265L413 302L400 336L411 340" stroke-width="13"/></g>
      <g class="jv-walk-leg"><path class="jv-limb" d="M410 265L403 305L410 340L426 340" stroke-width="13"/></g>
      <path class="jv-walk-shirt" d="M395 197Q399 188 410 189Q422 190 425 201L419 265H396L392 222Z"/>
      <path class="jv-person" d="M407 184V195H416V182Z"/>
      <circle class="jv-person" cx="414" cy="166" r="16"/>
      <path class="jv-walk-hair" d="M399 164Q395 145 414 146Q430 146 430 163L419 156L414 164Z"/>
      <path class="jv-person" d="M426 166L434 173L425 176Z"/>
      <g class="jv-walk-arm"><path class="jv-limb" d="M407 205L397 231L410 249" stroke-width="9"/></g>
    </g></g>`,
    puff: null,
  };
}

const ART = {
  car: carArt,
  motorcycle: motorcycleArt,
  bus: busArt,
  train: trainArt,
  bicycle: bicycleArt,
  walking: walkingArt,
};

function puffMarkup(puff) {
  if (!puff) return '';
  return `<g class="jv-puffs" transform="translate(${puff.x} ${puff.y})"><circle class="jv-puff" r="5" style="animation-delay:0s"/><circle class="jv-puff" r="6" style="animation-delay:1.1s"/><circle class="jv-puff" r="7" style="animation-delay:2.2s"/></g>`;
}

function vehicleGroup(id, uid) {
  const art = ART[id](uid);
  return {
    defs: art.defs,
    markup: `<g class="jv" data-vehicle="${id}"><g class="jv-drive">${puffMarkup(art.puff)}${art.markup}</g></g>`,
  };
}

function laneMarkup(index) {
  const y = LANE_ORIGIN_Y + index * LANE_GAP;
  const nodeRadius = index === 0 ? 7 : 4.5;
  return `<g class="jv-lane" data-lane="${index}" transform="translate(0 ${y})"><line class="jv-lane-track" x1="${ROUTE_START_X}" x2="${ROUTE_START_X + ROUTE_SPAN}" y1="0" y2="0"/><line class="jv-lane-run" x1="${ROUTE_START_X}" x2="${ROUTE_START_X + ROUTE_SPAN}" y1="0" y2="0"/><circle class="jv-node jv-node--start" cx="${ROUTE_START_X}" cy="0" r="${nodeRadius}"/><circle class="jv-node jv-node--end" cx="${ROUTE_START_X}" cy="0" r="${nodeRadius}"/></g>`;
}

function sceneMarkup(uid, options) {
  const lanes = Array.from({ length: LANE_COUNT }, (_, index) => laneMarkup(index)).join('');
  return `<svg class="jv-scene jv-theme-${options.theme}" viewBox="${SCENE_VIEWBOX}" role="img" aria-label="${options.label}" xmlns="http://www.w3.org/2000/svg" data-scene="${uid}"><defs data-defs></defs><path class="jv-road" d="M0 352H820"/><g data-fleet></g><g class="jv-route" data-route><text class="jv-label jv-label--start" x="${ROUTE_START_X}" y="${LANE_ORIGIN_Y - 22}">Rumah</text><text class="jv-label jv-label--end" x="${ROUTE_START_X}" y="${LANE_ORIGIN_Y - 22}" text-anchor="end">Tujuan</text>${lanes}<g class="jv-tag"><rect x="-42" y="-14" width="84" height="28" rx="14"/><text y="5" text-anchor="middle" data-tag>08 KM</text></g></g></svg>`;
}

export function routeShare(distance) {
  const { min, max } = LIMITS.distance;
  const ratio = (distance - min) / (max - min);
  return ROUTE_MIN_SHARE + (1 - ROUTE_MIN_SHARE) * Math.min(1, Math.max(0, ratio));
}

export function sceneLabel(view) {
  const vehicle = view.vehicle ? VEHICLES[view.vehicle].label : 'Kendaraan';
  if (!view.showRoute) return `Ilustrasi ${vehicle.toLowerCase()} di jalan`;
  const parts = [`${vehicle} menempuh ${view.distance} KM`];
  if (view.showFrequency) parts.push(`${view.frequency} kali dalam seminggu`);
  if (view.showOccupancy) parts.push(view.occupancy <= 1 ? 'sendiri' : `bersama ${view.occupancy} orang`);
  return parts.join(', ');
}

export function createScene(container, options = {}) {
  sceneCounter += 1;
  const uid = `jv${sceneCounter}`;
  const settings = {
    theme: options.theme || 'dark',
    label: options.label || 'Ilustrasi kendaraan dan rute perjalanan',
    lanes: options.lanes || 'full',
    probe: Boolean(options.probe),
  };

  container.innerHTML = sceneMarkup(uid, settings);

  const svg = container.querySelector('svg');
  const defs = svg.querySelector('[data-defs]');
  const fleet = svg.querySelector('[data-fleet]');
  const tag = svg.querySelector('[data-tag]');
  const lanes = Array.from(svg.querySelectorAll('.jv-lane'));
  const built = new Map();
  let activeId = null;

  svg.classList.toggle('is-single', settings.lanes === 'single');

  function ensureVehicle(id) {
    if (built.has(id)) return built.get(id);
    const group = vehicleGroup(id, uid);
    defs.insertAdjacentHTML('beforeend', group.defs);
    fleet.insertAdjacentHTML('beforeend', group.markup);
    const element = fleet.querySelector(`[data-vehicle="${id}"]`);
    built.set(id, element);
    return element;
  }

  function setVehicle(id, isPlaceholder) {
    const targetId = id || 'car';
    const element = ensureVehicle(targetId);
    built.forEach((node, key) => {
      node.classList.toggle('is-active', key === targetId);
    });
    svg.classList.toggle('is-placeholder', Boolean(isPlaceholder));
    activeId = targetId;
    return element;
  }

  function setOccupancy(count, plus) {
    const element = built.get(activeId);
    if (!element) return;
    element.querySelectorAll('[data-seat]').forEach((seat) => {
      const index = Number(seat.dataset.seat);
      const isPlusBadge = seat.classList.contains('jv-p--plus');
      const shouldShow = isPlusBadge ? plus && count >= 5 : index < count;
      seat.classList.toggle('is-on', shouldShow);
    });
  }

  function setRoute(distance) {
    const share = routeShare(distance);
    svg.style.setProperty('--p', share.toFixed(4));
    tag.textContent = distanceLabel(distance);
  }

  function setLanes(frequency, showGhost) {
    lanes.forEach((lane, index) => {
      const isOn = index < frequency;
      const isVisible = index === 0 || (settings.lanes === 'full' && showGhost);
      lane.classList.toggle('is-on', isOn);
      lane.classList.toggle('is-hidden', !isVisible);
      lane.classList.toggle('is-probe', settings.probe && index === Math.min(frequency, LANE_COUNT - 1) && frequency < LANE_COUNT);
    });
  }

  function update(view) {
    setVehicle(view.vehicle, !view.vehicle);
    const vehicle = view.vehicle ? VEHICLES[view.vehicle] : null;
    svg.classList.toggle('has-route', view.showRoute);
    svg.classList.toggle('has-frequency', view.showFrequency);
    svg.classList.toggle('has-occupancy', view.showOccupancy);
    setRoute(view.distance);
    setLanes(view.frequency, view.showFrequency);
    // People are the vehicle for walking and cycling, so keep their figure visible
    // even before the passenger question appears.
    setOccupancy(view.showOccupancy ? view.occupancy : (vehicle?.basis === 'none' ? 1 : 0), Boolean(vehicle && vehicle.plusOccupancy));
    svg.setAttribute('aria-label', sceneLabel(view));
  }

  return { update, svg, element: container };
}

// Shared artwork keeps the Aksi scene and vehicle selectors in the same family.
export function vehicleArtwork(id) {
  sceneCounter += 1;
  const uid = `jg${sceneCounter}`;
  const group = vehicleGroup(id, uid);
  const markup = group.markup.replace('class="jv"', 'class="jv is-active"');
  return `<defs>${group.defs}</defs>${markup}`;
}

export function vehicleGlyph(id) {
  return `<svg class="jv-glyph" viewBox="${GLYPH_VIEWBOX[id]}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${vehicleArtwork(id)}</svg>`;
}

export function lanesGraphic(count, theme = 'light') {
  const pitch = 20;
  const lanes = Array.from({ length: count }, (_, index) => {
    const y = 10 + index * pitch;
    return `<g class="jk-glane" style="--i:${index}"><line class="jk-glane-track" x1="10" x2="690" y1="${y}" y2="${y}"/><line class="jk-glane-line" x1="10" x2="690" y1="${y}" y2="${y}"/><circle class="jk-glane-node" cx="10" cy="${y}" r="7"/><circle class="jk-glane-node" cx="690" cy="${y}" r="7"/></g>`;
  }).join('');
  return `<svg class="jk-glanes jv-theme-${theme}" viewBox="0 0 700 ${count * pitch}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${lanes}</svg>`;
}
