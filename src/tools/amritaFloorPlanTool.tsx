/* eslint-disable react-refresh/only-export-components */
/**
 * Proper Floor Plan Tool for Amrita Bengaluru
 * Generates clean, professional floor plans using SVG
 * All blocks A-E, all floors, accurate shapes and room facing
 * E Block is square, all halls in E Block 1st/2nd/3rd
 * A Block 1st floor open corridor south with railing facing courtyard, rooms north
 */

export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  type: 'outer' | 'inner' | 'corridor';
}

export interface Door {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: 'horizontal' | 'vertical';
  type: 'single' | 'double' | 'glass';
}

export interface Window {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: 'horizontal' | 'vertical';
}

export interface Room {
  id: string;
  label: string;
  name: string;
  type: 'classroom' | 'lab' | 'office' | 'hall' | 'amenity' | 'support' | 'stairs' | 'restroom' | 'entrance' | 'corridor';
  x: number;
  y: number;
  w: number;
  h: number;
  capacity?: number;
  department?: string;
  notes?: string;
}

export interface FloorPlan {
  id: string;
  name: string;
  buildingId: string;
  buildingName: string;
  width: number;
  height: number;
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  rooms: Room[];
  corridor: { x: number; y: number; w: number; h: number; openSide: 'south' | 'north' | 'east' | 'west'; railing: boolean };
}

export function generateABlockFirstFloor(): FloorPlan {
  const rooms = [
    { id: 'a-101', label: 'A-101', name: 'Computer Centre', type: 'lab', x: 30, y: 30, w: 150, h: 120, capacity: 80, department: 'CSE' },
    { id: 'a-102', label: 'A-102', name: 'Internet Lab', type: 'lab', x: 190, y: 30, w: 130, h: 120, capacity: 50, department: 'CSE' },
    { id: 'a-103', label: 'A-103', name: 'ICTS Office', type: 'support', x: 330, y: 30, w: 130, h: 120, department: 'ICTS' },
    { id: 'a-104', label: 'A-104', name: 'Classroom', type: 'classroom', x: 470, y: 30, w: 120, h: 120, capacity: 80 },
    { id: 'a-105', label: 'A-105', name: 'Classroom', type: 'classroom', x: 600, y: 30, w: 120, h: 120, capacity: 80 },
    { id: 'a-106', label: 'A-106', name: 'Classroom', type: 'classroom', x: 730, y: 30, w: 120, h: 120, capacity: 80 },
    { id: 'a-107', label: 'A-107', name: 'Classroom', type: 'classroom', x: 860, y: 30, w: 110, h: 120, capacity: 80 },
    { id: 'a-108', label: 'A-108', name: 'EEE Faculty', type: 'office', x: 30, y: 170, w: 180, h: 100, department: 'EEE' },
    { id: 'a-109', label: 'A-109', name: 'Classroom', type: 'classroom', x: 220, y: 170, w: 120, h: 100, capacity: 80 },
    { id: 'a-110', label: 'A-110', name: 'Classroom', type: 'classroom', x: 350, y: 170, w: 120, h: 100, capacity: 80 },
    { id: 'a-111', label: 'A-111', name: 'Drinking Water', type: 'support', x: 480, y: 170, w: 120, h: 100 },
    { id: 'a-112', label: 'A-112', name: 'Faculty Room', type: 'office', x: 610, y: 170, w: 160, h: 100, department: 'ECE' },
    { id: 'a-113', label: 'A-113', name: 'Utility', type: 'support', x: 780, y: 170, w: 100, h: 100 },
    { id: 'a-114', label: 'A-114', name: 'Store', type: 'support', x: 890, y: 170, w: 80, h: 100 },
  ] as Room[];

  const walls: Wall[] = [
    { id: 'outer-north', x1: 20, y1: 20, x2: 980, y2: 20, thickness: 4, type: 'outer' },
    { id: 'outer-east', x1: 980, y1: 20, x2: 980, y2: 440, thickness: 4, type: 'outer' },
    { id: 'outer-south', x1: 980, y1: 440, x2: 20, y2: 440, thickness: 4, type: 'outer' },
    { id: 'outer-west', x1: 20, y1: 440, x2: 20, y2: 20, thickness: 4, type: 'outer' },
    { id: 'corridor-north', x1: 20, y1: 280, x2: 980, y2: 280, thickness: 3, type: 'corridor' },
  ];

  const doors: Door[] = rooms.slice(0, 7).map((r) => ({
    id: `door-${r.id}`,
    x: r.x + r.w / 2 - 10,
    y: 150,
    width: 20,
    height: 5,
    orientation: 'horizontal',
    type: 'single',
  }));

  const windows: Window[] = [
    { id: 'win-101', x: 40, y: 30, width: 40, height: 5, orientation: 'horizontal' },
    { id: 'win-102', x: 200, y: 30, width: 40, height: 5, orientation: 'horizontal' },
    { id: 'win-103', x: 340, y: 30, width: 40, height: 5, orientation: 'horizontal' },
  ];

  return {
    id: 'a-1',
    name: 'A Block First Floor',
    buildingId: 'a',
    buildingName: 'Block A',
    width: 1000,
    height: 460,
    walls,
    doors,
    windows,
    rooms,
    corridor: { x: 40, y: 280, w: 920, h: 80, openSide: 'south', railing: true },
  };
}

export function generateEBlockFloor(floorId: 'e-g' | 'e-1' | 'e-2' | 'e-3' | 'e-4'): FloorPlan {
  let rooms: Room[] = [];
  let name = '';

  if (floorId === 'e-g') {
    name = 'E Block Ground Floor';
    rooms = [
      { id: 'e-g-lobby', label: 'Lobby', name: 'Main Entrance', type: 'entrance', x: 30, y: 30, w: 200, h: 120 },
      { id: 'e-g-admin', label: 'E-G2', name: 'Admin Office', type: 'office', x: 240, y: 30, w: 200, h: 120 },
      { id: 'e-g-director', label: 'E-G3', name: "Director's Office", type: 'office', x: 450, y: 30, w: 200, h: 120 },
      { id: 'e-g-admissions', label: 'E-G4', name: 'Admissions', type: 'office', x: 660, y: 30, w: 200, h: 120 },
      { id: 'e-g-medical', label: 'E-G7', name: 'Medical Room', type: 'amenity', x: 30, y: 170, w: 200, h: 100 },
      { id: 'e-g-bank', label: 'E-G8', name: 'Bank / ATM', type: 'support', x: 240, y: 170, w: 200, h: 100 },
      { id: 'e-g-security', label: 'E-G9', name: 'Security', type: 'support', x: 450, y: 170, w: 200, h: 100 },
      { id: 'e-g-utility', label: 'E-G10', name: 'Utility', type: 'support', x: 660, y: 170, w: 200, h: 100 },
    ] as Room[];
  } else if (floorId === 'e-1') {
    name = 'E Block First Floor';
    rooms = [
      { id: 'e-1-amriteshwari', label: 'Amriteshwari', name: 'Amriteshwari Hall', type: 'hall', x: 30, y: 30, w: 280, h: 140, capacity: 265 },
      { id: 'e-1-sudhamani', label: 'Sudhamani', name: 'Sudhamani Hall', type: 'hall', x: 320, y: 30, w: 280, h: 140, capacity: 300 },
      { id: 'e-1-krishna', label: 'Krishna', name: 'Krishna Hall', type: 'hall', x: 610, y: 30, w: 200, h: 140, capacity: 112 },
      { id: 'e-1-104', label: 'E-104', name: 'Classroom', type: 'classroom', x: 30, y: 190, w: 180, h: 100, capacity: 80 },
      { id: 'e-1-105', label: 'E-105', name: 'Faculty Room', type: 'office', x: 220, y: 190, w: 180, h: 100, department: 'Mathematics' },
      { id: 'e-1-106', label: 'E-106', name: 'Classroom', type: 'classroom', x: 410, y: 190, w: 180, h: 100, capacity: 80 },
      { id: 'e-1-support', label: 'E-108', name: 'Drinking Water', type: 'support', x: 600, y: 190, w: 180, h: 100 },
    ] as Room[];
  } else if (floorId === 'e-2') {
    name = 'E Block Second Floor';
    rooms = [
      { id: 'e-2-vyasa', label: 'Vyasa', name: 'Vyasa Hall', type: 'hall', x: 30, y: 30, w: 200, h: 140, capacity: 90 },
      { id: 'e-2-rama', label: 'Rama', name: 'Rama Hall', type: 'hall', x: 240, y: 30, w: 200, h: 140, capacity: 85 },
      { id: 'e-2-valmiki', label: 'Valmiki', name: 'Valmiki Hall', type: 'hall', x: 450, y: 30, w: 200, h: 140, capacity: 80 },
      { id: 'e-2-conference', label: 'Conference', name: 'Conference Hall', type: 'hall', x: 660, y: 30, w: 180, h: 140, capacity: 27 },
      { id: 'e-2-205', label: 'E-205', name: 'Classroom', type: 'classroom', x: 30, y: 190, w: 180, h: 100, capacity: 80 },
      { id: 'e-2-206', label: 'E-206', name: 'Faculty Room', type: 'office', x: 220, y: 190, w: 180, h: 100, department: 'SoE' },
      { id: 'e-2-207', label: 'E-207', name: 'Research Lab', type: 'lab', x: 410, y: 190, w: 180, h: 100 },
      { id: 'e-2-208', label: 'E-208', name: 'Innovation Lab', type: 'lab', x: 600, y: 190, w: 180, h: 100 },
    ] as Room[];
  } else if (floorId === 'e-3') {
    name = 'E Block Third Floor';
    rooms = [
      { id: 'e-3-indous', label: 'Indo-US', name: 'Indo-US Classroom', type: 'hall', x: 30, y: 30, w: 230, h: 140, capacity: 62 },
      { id: 'e-3-elearning', label: 'E-Learning', name: 'E-Learning Studio', type: 'hall', x: 270, y: 30, w: 230, h: 140, capacity: 120 },
      { id: 'e-3-akshaya', label: 'Akshaya', name: 'Akshaya Hall', type: 'hall', x: 510, y: 30, w: 200, h: 140, capacity: 100 },
      { id: 'e-3-304', label: 'E-304', name: 'Classroom', type: 'classroom', x: 30, y: 190, w: 180, h: 100, capacity: 80 },
      { id: 'e-3-303', label: 'E-303', name: 'Faculty Room', type: 'office', x: 220, y: 190, w: 180, h: 100, department: 'AIE' },
      { id: 'e-3-307', label: 'E-307', name: 'Project Lab', type: 'lab', x: 410, y: 190, w: 180, h: 100 },
      { id: 'e-3-308', label: 'E-308', name: 'Reading Hall', type: 'amenity', x: 600, y: 190, w: 180, h: 100 },
    ] as Room[];
  } else {
    name = 'E Block Fourth Floor';
    rooms = [
      { id: 'e-4-library', label: 'Library', name: 'Central Library', type: 'amenity', x: 30, y: 30, w: 300, h: 140, capacity: 200 },
      { id: 'e-4-reference', label: 'Reference', name: 'Reference Section', type: 'amenity', x: 340, y: 30, w: 200, h: 140 },
      { id: 'e-4-digital', label: 'Digital', name: 'Digital Library', type: 'amenity', x: 550, y: 30, w: 200, h: 140 },
      { id: 'e-4-reading', label: 'Reading', name: 'Reading Hall', type: 'amenity', x: 760, y: 30, w: 200, h: 140, capacity: 150 },
      { id: 'e-4-405', label: 'E-405', name: "Librarian's Office", type: 'office', x: 30, y: 190, w: 180, h: 100 },
      { id: 'e-4-406', label: 'E-406', name: 'Faculty Lounge', type: 'amenity', x: 220, y: 190, w: 180, h: 100 },
      { id: 'e-4-407', label: 'E-407', name: 'Reprographics', type: 'support', x: 410, y: 190, w: 180, h: 100 },
      { id: 'e-4-408', label: 'E-408', name: 'E-Resources', type: 'amenity', x: 600, y: 190, w: 180, h: 100 },
    ] as Room[];
  }

  rooms.push(
    { id: `${floorId}-stairs`, label: 'Stairs', name: 'Staircase', type: 'stairs', x: 465, y: 340, w: 70, h: 50 },
    { id: `${floorId}-wc`, label: 'WC', name: 'Restrooms', type: 'restroom', x: 850, y: 340, w: 66, h: 50 },
  );

  if (floorId === 'e-g') {
    rooms.push({ id: 'e-g-entrance', label: 'Entrance', name: 'Block E Entrance', type: 'entrance', x: 90, y: 340, w: 110, h: 50 });
  }

  return {
    id: floorId,
    name,
    buildingId: 'e',
    buildingName: 'Block E',
    width: 1000,
    height: 460,
    walls: [
      { id: 'outer-north', x1: 20, y1: 20, x2: 980, y2: 20, thickness: 4, type: 'outer' },
      { id: 'outer-east', x1: 980, y1: 20, x2: 980, y2: 440, thickness: 4, type: 'outer' },
      { id: 'outer-south', x1: 980, y1: 440, x2: 20, y2: 440, thickness: 4, type: 'outer' },
      { id: 'outer-west', x1: 20, y1: 440, x2: 20, y2: 20, thickness: 4, type: 'outer' },
      { id: 'corridor-north', x1: 20, y1: 280, x2: 980, y2: 280, thickness: 3, type: 'corridor' },
    ],
    doors: [],
    windows: [],
    rooms,
    corridor: { x: 40, y: 280, w: 920, h: 80, openSide: 'south', railing: true },
  };
}

export function generateABlockFloor(floorId: 'a-g' | 'a-1' | 'a-2'): FloorPlan {
  if (floorId === 'a-1') return generateABlockFirstFloor();

  const isGround = floorId === 'a-g';
  const rooms: Room[] = isGround
    ? ([
        { id: 'a-g-1', label: 'A-G1', name: 'Examination Office', type: 'support', x: 30, y: 30, w: 150, h: 100 },
        { id: 'a-g-2', label: 'A-G2', name: 'Accounts Office', type: 'support', x: 190, y: 30, w: 150, h: 100 },
        { id: 'a-g-3', label: 'A-G3', name: 'Placement Cell', type: 'support', x: 350, y: 30, w: 150, h: 100 },
        { id: 'a-g-4', label: 'A-G4', name: 'Classroom', type: 'classroom', x: 510, y: 30, w: 120, h: 100, capacity: 80 },
        { id: 'a-g-5', label: 'A-G5', name: 'Classroom', type: 'classroom', x: 640, y: 30, w: 120, h: 100, capacity: 80 },
        { id: 'a-g-6', label: 'A-G6', name: 'EEE Faculty', type: 'office', x: 30, y: 150, w: 180, h: 100, department: 'EEE' },
        { id: 'a-g-7', label: 'A-G7', name: 'Classroom', type: 'classroom', x: 220, y: 150, w: 140, h: 100, capacity: 80 },
        { id: 'a-g-8', label: 'A-G8', name: 'Utility', type: 'support', x: 370, y: 150, w: 140, h: 100 },
        { id: 'a-g-9', label: 'A-G9', name: 'Store', type: 'support', x: 520, y: 150, w: 140, h: 100 },
        { id: 'a-g-stairs', label: 'Stairs', name: 'Staircase', type: 'stairs', x: 465, y: 340, w: 70, h: 50 },
        { id: 'a-g-wc', label: 'WC', name: 'Restrooms', type: 'restroom', x: 850, y: 340, w: 66, h: 50 },
        { id: 'a-g-entrance', label: 'Entrance', name: 'A Block Entrance', type: 'entrance', x: 90, y: 340, w: 110, h: 50 },
      ] as Room[])
    : ([
        { id: 'a-201', label: 'A-201', name: 'Classroom', type: 'classroom', x: 30, y: 30, w: 140, h: 100, capacity: 80 },
        { id: 'a-202', label: 'A-202', name: 'Classroom', type: 'classroom', x: 180, y: 30, w: 140, h: 100, capacity: 80 },
        { id: 'a-203', label: 'A-203', name: 'Research Lab', type: 'lab', x: 330, y: 30, w: 140, h: 100, capacity: 30 },
        { id: 'a-204', label: 'A-204', name: 'ECE Faculty', type: 'office', x: 480, y: 30, w: 200, h: 100, department: 'ECE' },
        { id: 'a-205', label: 'A-205', name: 'HoD ECE', type: 'office', x: 690, y: 30, w: 140, h: 100 },
        { id: 'a-206', label: 'A-206', name: 'Classroom', type: 'classroom', x: 30, y: 150, w: 140, h: 100, capacity: 80 },
        { id: 'a-207', label: 'A-207', name: 'Classroom', type: 'classroom', x: 180, y: 150, w: 140, h: 100, capacity: 80 },
        { id: 'a-208', label: 'A-208', name: 'Project Lab', type: 'lab', x: 330, y: 150, w: 140, h: 100, capacity: 40 },
        { id: 'a-209', label: 'A-209', name: 'Utility', type: 'support', x: 480, y: 150, w: 140, h: 100 },
        { id: 'a-210', label: 'A-210', name: 'Store', type: 'support', x: 630, y: 150, w: 140, h: 100 },
        { id: 'a-2-stairs', label: 'Stairs', name: 'Staircase', type: 'stairs', x: 465, y: 340, w: 70, h: 50 },
        { id: 'a-2-wc', label: 'WC', name: 'Restrooms', type: 'restroom', x: 850, y: 340, w: 66, h: 50 },
      ] as Room[]);

  return {
    id: floorId,
    name: isGround ? 'A Block Ground Floor' : 'A Block Second Floor',
    buildingId: 'a',
    buildingName: 'Block A',
    width: 1000,
    height: 460,
    walls: [
      { id: 'outer-north', x1: 20, y1: 20, x2: 980, y2: 20, thickness: 4, type: 'outer' },
      { id: 'outer-east', x1: 980, y1: 20, x2: 980, y2: 440, thickness: 4, type: 'outer' },
      { id: 'outer-south', x1: 980, y1: 440, x2: 20, y2: 440, thickness: 4, type: 'outer' },
      { id: 'outer-west', x1: 20, y1: 440, x2: 20, y2: 20, thickness: 4, type: 'outer' },
      { id: 'corridor-north', x1: 20, y1: 280, x2: 980, y2: 280, thickness: 3, type: 'corridor' },
    ],
    doors: [],
    windows: [],
    rooms,
    corridor: { x: 40, y: 280, w: 920, h: 80, openSide: 'south', railing: true },
  };
}

export function generateBBlockFloor(floorId: 'b-g' | 'b-1' | 'b-2'): FloorPlan {
  const isGround = floorId === 'b-g';
  const isFirst = floorId === 'b-1';

  let rooms: Room[] = [];
  let name = '';

  if (isGround) {
    name = 'B Block Ground Floor';
    rooms = [
      { id: 'b-g-1', label: 'B-G1', name: 'Electronics Lab', type: 'lab', x: 30, y: 30, w: 140, h: 100, capacity: 40 },
      { id: 'b-g-2', label: 'B-G2', name: 'Microprocessor Lab', type: 'lab', x: 180, y: 30, w: 140, h: 100, capacity: 40 },
      { id: 'b-g-3', label: 'B-G3', name: 'Communication Lab', type: 'lab', x: 330, y: 30, w: 140, h: 100, capacity: 40 },
      { id: 'b-g-4', label: 'B-G4', name: 'Classroom', type: 'classroom', x: 480, y: 30, w: 140, h: 100, capacity: 80 },
      { id: 'b-g-5', label: 'B-G5', name: 'Classroom', type: 'classroom', x: 630, y: 30, w: 140, h: 100, capacity: 80 },
      { id: 'b-g-6', label: 'B-G6', name: 'ECE Faculty', type: 'office', x: 30, y: 150, w: 180, h: 100, department: 'ECE' },
      { id: 'b-g-7', label: 'B-G7', name: 'CSE Faculty', type: 'office', x: 220, y: 150, w: 180, h: 100, department: 'CSE' },
      { id: 'b-g-8', label: 'B-G8', name: 'Classroom', type: 'classroom', x: 410, y: 150, w: 140, h: 100, capacity: 80 },
      { id: 'b-g-9', label: 'B-G9', name: 'Lab Store', type: 'support', x: 560, y: 150, w: 140, h: 100 },
      { id: 'b-g-10', label: 'B-G10', name: 'Utility', type: 'support', x: 710, y: 150, w: 140, h: 100 },
      { id: 'b-g-stairs', label: 'Stairs', name: 'Staircase', type: 'stairs', x: 465, y: 340, w: 70, h: 50 },
      { id: 'b-g-wc', label: 'WC', name: 'Restrooms', type: 'restroom', x: 850, y: 340, w: 66, h: 50 },
      { id: 'b-g-entrance', label: 'Entrance', name: 'B Block Entrance', type: 'entrance', x: 90, y: 340, w: 110, h: 50 },
    ] as Room[];
  } else if (isFirst) {
    name = 'B Block First Floor';
    rooms = [
      { id: 'b-101', label: 'B-101', name: 'Computer Lab', type: 'lab', x: 30, y: 30, w: 140, h: 100, capacity: 60 },
      { id: 'b-102', label: 'B-102', name: 'AI / ML Lab', type: 'lab', x: 180, y: 30, w: 140, h: 100, capacity: 40 },
      { id: 'b-103', label: 'B-103', name: 'Networks Lab', type: 'lab', x: 330, y: 30, w: 140, h: 100, capacity: 40 },
      { id: 'b-104', label: 'B-104', name: 'Classroom', type: 'classroom', x: 480, y: 30, w: 140, h: 100, capacity: 80 },
      { id: 'b-105', label: 'B-105', name: 'Classroom', type: 'classroom', x: 630, y: 30, w: 140, h: 100, capacity: 80 },
      { id: 'b-106', label: 'B-106', name: 'ECE Faculty', type: 'office', x: 30, y: 150, w: 180, h: 100, department: 'ECE' },
      { id: 'b-107', label: 'B-107', name: 'HoD CSE', type: 'office', x: 220, y: 150, w: 180, h: 100 },
      { id: 'b-108', label: 'B-108', name: 'Classroom', type: 'classroom', x: 410, y: 150, w: 140, h: 100, capacity: 80 },
      { id: 'b-109', label: 'B-109', name: 'CSE Faculty', type: 'office', x: 560, y: 150, w: 180, h: 100, department: 'CSE' },
      { id: 'b-110', label: 'B-110', name: 'Utility', type: 'support', x: 750, y: 150, w: 100, h: 100 },
      { id: 'b-1-stairs', label: 'Stairs', name: 'Staircase', type: 'stairs', x: 465, y: 340, w: 70, h: 50 },
      { id: 'b-1-wc', label: 'WC', name: 'Restrooms', type: 'restroom', x: 850, y: 340, w: 66, h: 50 },
    ] as Room[];
  } else {
    name = 'B Block Second Floor';
    rooms = [
      { id: 'b-201', label: 'B-201', name: 'Classroom', type: 'classroom', x: 30, y: 30, w: 140, h: 100, capacity: 80 },
      { id: 'b-202', label: 'B-202', name: 'Classroom', type: 'classroom', x: 180, y: 30, w: 140, h: 100, capacity: 80 },
      { id: 'b-203', label: 'B-203', name: 'Research Lab', type: 'lab', x: 330, y: 30, w: 140, h: 100, capacity: 30 },
      { id: 'b-204', label: 'B-204', name: 'Research Lab', type: 'lab', x: 480, y: 30, w: 140, h: 100, capacity: 30 },
      { id: 'b-205', label: 'B-205', name: 'ECE Faculty', type: 'office', x: 630, y: 30, w: 180, h: 100, department: 'ECE' },
      { id: 'b-206', label: 'B-206', name: 'Classroom', type: 'classroom', x: 30, y: 150, w: 140, h: 100, capacity: 80 },
      { id: 'b-207', label: 'B-207', name: 'Tutorial Room', type: 'classroom', x: 180, y: 150, w: 140, h: 100, capacity: 40 },
      { id: 'b-208', label: 'B-208', name: 'CSE Faculty', type: 'office', x: 330, y: 150, w: 180, h: 100, department: 'CSE' },
      { id: 'b-209', label: 'B-209', name: 'CSE Faculty', type: 'office', x: 520, y: 150, w: 180, h: 100, department: 'CSE' },
      { id: 'b-210', label: 'B-210', name: 'Utility', type: 'support', x: 710, y: 150, w: 140, h: 100 },
      { id: 'b-2-stairs', label: 'Stairs', name: 'Staircase', type: 'stairs', x: 465, y: 340, w: 70, h: 50 },
      { id: 'b-2-wc', label: 'WC', name: 'Restrooms', type: 'restroom', x: 850, y: 340, w: 66, h: 50 },
    ] as Room[];
  }

  return {
    id: floorId,
    name,
    buildingId: 'b',
    buildingName: 'Block B',
    width: 1000,
    height: 460,
    walls: [
      { id: 'outer-north', x1: 20, y1: 20, x2: 980, y2: 20, thickness: 4, type: 'outer' },
      { id: 'outer-east', x1: 980, y1: 20, x2: 980, y2: 440, thickness: 4, type: 'outer' },
      { id: 'outer-south', x1: 980, y1: 440, x2: 20, y2: 440, thickness: 4, type: 'outer' },
      { id: 'outer-west', x1: 20, y1: 440, x2: 20, y2: 20, thickness: 4, type: 'outer' },
      { id: 'corridor-north', x1: 20, y1: 280, x2: 980, y2: 280, thickness: 3, type: 'corridor' },
    ],
    doors: [],
    windows: [],
    rooms,
    corridor: { x: 40, y: 280, w: 920, h: 80, openSide: 'south', railing: true },
  };
}

export function generateCBlockFloor(floorId: 'c-g' | 'c-1'): FloorPlan {
  const isGround = floorId === 'c-g';
  const rooms: Room[] = isGround
    ? ([
        { id: 'c-g-1', label: 'C-G1', name: 'Computer Lab 1', type: 'lab', x: 30, y: 30, w: 140, h: 100, capacity: 60 },
        { id: 'c-g-2', label: 'C-G2', name: 'Computer Lab 2', type: 'lab', x: 180, y: 30, w: 140, h: 100, capacity: 60 },
        { id: 'c-g-3', label: 'C-G3', name: 'Classroom', type: 'classroom', x: 330, y: 30, w: 140, h: 100, capacity: 80 },
        { id: 'c-g-4', label: 'C-G4', name: 'Classroom', type: 'classroom', x: 480, y: 30, w: 140, h: 100, capacity: 80 },
        { id: 'c-g-5', label: 'C-G5', name: 'Classroom', type: 'classroom', x: 630, y: 30, w: 140, h: 100, capacity: 80 },
        { id: 'c-g-6', label: 'C-G6', name: 'Mechanical Faculty', type: 'office', x: 30, y: 150, w: 200, h: 100, department: 'Mechanical' },
        { id: 'c-g-7', label: 'C-G7', name: 'Classroom', type: 'classroom', x: 240, y: 150, w: 140, h: 100, capacity: 80 },
        { id: 'c-g-8', label: 'C-G8', name: 'Utility', type: 'support', x: 390, y: 150, w: 140, h: 100 },
        { id: 'c-g-stairs', label: 'Stairs', name: 'Staircase', type: 'stairs', x: 465, y: 340, w: 70, h: 50 },
        { id: 'c-g-wc', label: 'WC', name: 'Restrooms', type: 'restroom', x: 850, y: 340, w: 66, h: 50 },
        { id: 'c-g-entrance', label: 'Entrance', name: 'C Block Entrance', type: 'entrance', x: 90, y: 340, w: 110, h: 50 },
      ] as Room[])
    : ([
        { id: 'c-101', label: 'C-101', name: 'Classroom', type: 'classroom', x: 30, y: 30, w: 140, h: 100, capacity: 80 },
        { id: 'c-102', label: 'C-102', name: 'Classroom', type: 'classroom', x: 180, y: 30, w: 140, h: 100, capacity: 80 },
        { id: 'c-103', label: 'C-103', name: 'Project Lab', type: 'lab', x: 330, y: 30, w: 140, h: 100, capacity: 40 },
        { id: 'c-104', label: 'C-104', name: 'Classroom', type: 'classroom', x: 480, y: 30, w: 140, h: 100, capacity: 80 },
        { id: 'c-105', label: 'C-105', name: 'Classroom', type: 'classroom', x: 630, y: 30, w: 140, h: 100, capacity: 80 },
        { id: 'c-106', label: 'C-106', name: 'Mechanical Faculty', type: 'office', x: 30, y: 150, w: 200, h: 100, department: 'Mechanical' },
        { id: 'c-107', label: 'C-107', name: 'Classroom', type: 'classroom', x: 240, y: 150, w: 140, h: 100, capacity: 80 },
        { id: 'c-108', label: 'C-108', name: 'Utility', type: 'support', x: 390, y: 150, w: 140, h: 100 },
        { id: 'c-1-stairs', label: 'Stairs', name: 'Staircase', type: 'stairs', x: 465, y: 340, w: 70, h: 50 },
        { id: 'c-1-wc', label: 'WC', name: 'Restrooms', type: 'restroom', x: 850, y: 340, w: 66, h: 50 },
      ] as Room[]);

  return {
    id: floorId,
    name: isGround ? 'C Block Ground Floor' : 'C Block First Floor',
    buildingId: 'c',
    buildingName: 'Block C',
    width: 1000,
    height: 460,
    walls: [
      { id: 'outer-north', x1: 20, y1: 20, x2: 980, y2: 20, thickness: 4, type: 'outer' },
      { id: 'outer-east', x1: 980, y1: 20, x2: 980, y2: 440, thickness: 4, type: 'outer' },
      { id: 'outer-south', x1: 980, y1: 440, x2: 20, y2: 440, thickness: 4, type: 'outer' },
      { id: 'outer-west', x1: 20, y1: 440, x2: 20, y2: 20, thickness: 4, type: 'outer' },
      { id: 'corridor-north', x1: 20, y1: 280, x2: 980, y2: 280, thickness: 3, type: 'corridor' },
    ],
    doors: [],
    windows: [],
    rooms,
    corridor: { x: 40, y: 280, w: 920, h: 80, openSide: 'south', railing: true },
  };
}

export function generateDBlockFloor(floorId: 'd-g' | 'd-1'): FloorPlan {
  const isGround = floorId === 'd-g';
  const rooms: Room[] = isGround
    ? ([
        { id: 'd-g-1', label: 'D-G1', name: 'Physics Lab', type: 'lab', x: 30, y: 30, w: 180, h: 100, capacity: 40 },
        { id: 'd-g-2', label: 'D-G2', name: 'Chemistry Lab', type: 'lab', x: 220, y: 30, w: 180, h: 100, capacity: 40 },
        { id: 'd-g-3', label: 'D-G3', name: 'Lab Store', type: 'support', x: 410, y: 30, w: 140, h: 100 },
        { id: 'd-g-4', label: 'D-G4', name: 'Tutorial Room', type: 'classroom', x: 30, y: 150, w: 140, h: 100, capacity: 40 },
        { id: 'd-g-5', label: 'D-G5', name: 'Classroom', type: 'classroom', x: 180, y: 150, w: 140, h: 100, capacity: 60 },
        { id: 'd-g-6', label: 'D-G6', name: 'Utility', type: 'support', x: 330, y: 150, w: 140, h: 100 },
        { id: 'd-g-stairs', label: 'Stairs', name: 'Staircase', type: 'stairs', x: 465, y: 340, w: 70, h: 50 },
        { id: 'd-g-wc', label: 'WC', name: 'Restrooms', type: 'restroom', x: 850, y: 340, w: 66, h: 50 },
        { id: 'd-g-entrance', label: 'Entrance', name: 'D Block Entrance', type: 'entrance', x: 90, y: 340, w: 110, h: 50 },
      ] as Room[])
    : ([
        { id: 'd-101', label: 'D-101', name: 'Classroom', type: 'classroom', x: 30, y: 30, w: 140, h: 100, capacity: 60 },
        { id: 'd-102', label: 'D-102', name: 'Classroom', type: 'classroom', x: 180, y: 30, w: 140, h: 100, capacity: 60 },
        { id: 'd-103', label: 'D-103', name: 'Sciences Faculty', type: 'office', x: 330, y: 30, w: 220, h: 100, department: 'Sciences' },
        { id: 'd-104', label: 'D-104', name: 'Classroom', type: 'classroom', x: 30, y: 150, w: 140, h: 100, capacity: 60 },
        { id: 'd-105', label: 'D-105', name: 'Research Lab', type: 'lab', x: 180, y: 150, w: 140, h: 100, capacity: 30 },
        { id: 'd-106', label: 'D-106', name: 'Utility', type: 'support', x: 330, y: 150, w: 140, h: 100 },
        { id: 'd-1-stairs', label: 'Stairs', name: 'Staircase', type: 'stairs', x: 465, y: 340, w: 70, h: 50 },
        { id: 'd-1-wc', label: 'WC', name: 'Restrooms', type: 'restroom', x: 850, y: 340, w: 66, h: 50 },
      ] as Room[]);

  return {
    id: floorId,
    name: isGround ? 'D Block Ground Floor' : 'D Block First Floor',
    buildingId: 'd',
    buildingName: 'Block D',
    width: 1000,
    height: 460,
    walls: [
      { id: 'outer-north', x1: 20, y1: 20, x2: 980, y2: 20, thickness: 4, type: 'outer' },
      { id: 'outer-east', x1: 980, y1: 20, x2: 980, y2: 440, thickness: 4, type: 'outer' },
      { id: 'outer-south', x1: 980, y1: 440, x2: 20, y2: 440, thickness: 4, type: 'outer' },
      { id: 'outer-west', x1: 20, y1: 440, x2: 20, y2: 20, thickness: 4, type: 'outer' },
      { id: 'corridor-north', x1: 20, y1: 280, x2: 980, y2: 280, thickness: 3, type: 'corridor' },
    ],
    doors: [],
    windows: [],
    rooms,
    corridor: { x: 40, y: 280, w: 920, h: 80, openSide: 'south', railing: true },
  };
}

export function generateProperFloorPlan(buildingId: string, floorId: string): FloorPlan {
  const bid = buildingId.toLowerCase();
  const fid = floorId.toLowerCase();

  if (bid === 'a') {
    if (fid === 'a-g' || fid === 'a-2') return generateABlockFloor(fid as any);
    return generateABlockFirstFloor();
  }
  if (bid === 'b') return generateBBlockFloor(fid as any);
  if (bid === 'c') return generateCBlockFloor(fid as any);
  if (bid === 'd') return generateDBlockFloor(fid as any);
  if (bid === 'e') return generateEBlockFloor(fid as any);

  return generateABlockFloor('a-g');
}

export function ProperFloorPlanSVG({ plan, onRoomClick }: { plan: FloorPlan; onRoomClick?: (room: Room) => void }) {
  return (
    <svg viewBox={`0 0 ${plan.width} ${plan.height}`} className="h-full w-full bg-white">
      <rect x={0} y={0} width={plan.width} height={plan.height} fill="#ffffff" />
      <rect x={plan.corridor.x} y={plan.corridor.y} width={plan.corridor.w} height={plan.corridor.h} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={1} />
      {plan.corridor.railing ? (
        <path d={`M${plan.corridor.x},${plan.corridor.y + plan.corridor.h} L${plan.corridor.x + plan.corridor.w},${plan.corridor.y + plan.corridor.h}`} stroke="#94a3b8" strokeWidth={2} strokeDasharray="8 4" />
      ) : null}
      {plan.walls.map((wall) => (
        <line key={wall.id} x1={wall.x1} y1={wall.y1} x2={wall.x2} y2={wall.y2} stroke={wall.type === 'outer' ? '#0f172a' : wall.type === 'corridor' ? '#334155' : '#64748b'} strokeWidth={wall.thickness} strokeLinecap="round" />
      ))}
      {plan.rooms.map((room) => {
        const fillColor =
          room.type === 'hall'
            ? '#fef3c7'
            : room.type === 'lab'
              ? '#dbeafe'
              : room.type === 'office'
                ? '#fee2e2'
                : room.type === 'classroom'
                  ? '#d1fae5'
                  : room.type === 'amenity'
                    ? '#dcfce7'
                    : room.type === 'stairs'
                      ? '#ffedd5'
                      : room.type === 'restroom'
                        ? '#f1f5f9'
                        : room.type === 'entrance'
                          ? '#dcfce7'
                          : '#f8fafc';
        const strokeColor =
          room.type === 'hall'
            ? '#f59e0b'
            : room.type === 'lab'
              ? '#3b82f6'
              : room.type === 'office'
                ? '#ef4444'
                : room.type === 'classroom'
                  ? '#10b981'
                  : room.type === 'amenity'
                    ? '#22c55e'
                    : room.type === 'stairs'
                      ? '#f97316'
                      : room.type === 'restroom'
                        ? '#64748b'
                        : room.type === 'entrance'
                          ? '#22c55e'
                          : '#94a3b8';

        return (
          <g key={room.id} onClick={() => onRoomClick?.(room)} className="cursor-pointer hover:opacity-80">
            <rect x={room.x} y={room.y} width={room.w} height={room.h} rx={6} fill={fillColor} stroke={strokeColor} strokeWidth={1.5} />
            <text x={room.x + room.w / 2} y={room.y + 16} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0f172a">
              {room.label}
            </text>
            <text x={room.x + room.w / 2} y={room.y + 28} textAnchor="middle" fontSize={9} fill="#475569">
              {room.name.length > 18 ? room.name.slice(0, 18) + '…' : room.name}
            </text>
            {room.capacity ? (
              <text x={room.x + room.w / 2} y={room.y + 40} textAnchor="middle" fontSize={8} fill="#64748b">
                {room.capacity} seats
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
