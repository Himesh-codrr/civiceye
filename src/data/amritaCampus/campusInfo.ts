/**
 * Amrita Bengaluru Campus — public information
 */

export const CAMPUS_ADDRESS = {
  name: 'Amrita Vishwa Vidyapeetham, Bengaluru Campus',
  short: 'Amrita Bengaluru',
  address: 'Kasavanahalli, Carmelaram P.O., Off Sarjapur Road, Bengaluru, Karnataka 560035',
  plusCode: 'VMVG+V8W, Amrita Nagar, Choodasandra, Junnasandra, Bengaluru',
  phone: '080 - 25183700',
  email: 'info@blr.amrita.edu',
  website: 'https://www.amrita.edu/campus/bengaluru/',
};

export const CAMPUS_STATS = {
  buildings: 12,
  blocks: 5,
  floors: 15,
  rooms: 165,
  facultyPublic: 155,
  halls: 9,
  gates: 3,
};

export const BLOCKS_INFO = [
  {
    id: 'E',
    name: 'Block E',
    role: 'Main Block',
    floors: 5,
    area: 2587,
    position: 'Main Campus',
    highlights: ['Main Entrance & Reception', 'Administrative Office', "Director's Office", 'Medical Room', 'Central Library', 'All Halls'],
    color: '#A51636',
  },
  {
    id: 'A',
    name: 'Block A',
    role: 'Academic Block A',
    floors: 3,
    area: 2138,
    position: 'Academic Zone',
    highlights: ['Faculty Rooms', 'Examination Office', 'Training & Placement Cell', 'Computer Labs'],
    color: '#ef4444',
  },
  {
    id: 'B',
    name: 'Block B',
    role: 'Academic Block B',
    floors: 3,
    area: 2098,
    position: 'Academic Zone',
    highlights: ['Faculty Rooms', 'Electronics Labs', 'Computer Labs', 'AI / ML Lab'],
    color: '#22c55e',
  },
  {
    id: 'C',
    name: 'Block C',
    role: 'Academic Block C',
    floors: 2,
    area: 2153,
    position: 'Academic Zone',
    highlights: ['Faculty Rooms', 'Computer Labs', 'Project Labs'],
    color: '#3b82f6',
  },
  {
    id: 'D',
    name: 'Block D',
    role: 'Academic Block D',
    floors: 2,
    area: 578,
    position: 'Academic Zone',
    highlights: ['Physics Lab', 'Chemistry Lab', 'Faculty Room', 'Classrooms'],
    color: '#eab308',
  },
];

export const HALLS_INFO = [
  { name: 'Amriteshwari Hall', capacity: 265, block: 'E', use: 'In-campus functions' },
  { name: 'Sudhamani Hall', capacity: 300, block: 'E', use: 'Seminars & Placements' },
  { name: 'Krishna Hall', capacity: 112, block: 'E', use: 'Seminars' },
  { name: 'Vyasa Hall', capacity: 90, block: 'E', use: 'Seminars' },
  { name: 'Rama Hall', capacity: 85, block: 'E', use: 'Seminars' },
  { name: 'Valmiki Hall', capacity: 80, block: 'E', use: 'Seminars' },
  { name: 'Conference Hall', capacity: 27, block: 'E', use: 'Meetings' },
  { name: 'Indo-US Corporate Classroom', capacity: 62, block: 'E', use: 'Lecture Studio' },
  { name: 'E-Learning Studio', capacity: 120, block: 'E', use: 'Online Lectures' },
  { name: 'Central Library', capacity: 200, block: 'E', floor: '4th', use: 'Library & Reading Hall' },
  { name: 'Akshaya Hall', capacity: 100, block: 'E', use: 'Seminars' },
];

export const AMENITIES = [
  { name: 'Cafeteria', kind: 'food', zone: 'south' },
  { name: 'Playing Field', kind: 'sport', zone: 'north' },
  { name: 'Tennis & Basketball Courts', kind: 'sport', zone: 'north' },
  { name: 'Indoor Sports Hall', kind: 'support', zone: 'north' },
  { name: 'Badminton Court', kind: 'sport', zone: 'south' },
  { name: 'Open-Air Stage', kind: 'amenity', zone: 'south' },
  { name: 'Hostels', kind: 'hostel', zone: 'north' },
  { name: 'Bus Stop', kind: 'transit', zone: 'outside' },
];

export const DEPARTMENTS = [
  { id: 'CSE', name: 'Computer Science & Engineering', school: 'School of Computing', blocks: ['B'], facultyCount: 46 },
  { id: 'ECE', name: 'Electronics & Communication Engineering', school: 'School of Engineering', blocks: ['A', 'B'], facultyCount: 40 },
  { id: 'EEE', name: 'Electrical & Electronics Engineering', school: 'School of Engineering', blocks: ['A'], facultyCount: 17 },
  { id: 'Mechanical', name: 'Mechanical Engineering', school: 'School of Engineering', blocks: ['C'], facultyCount: 22 },
  { id: 'AIE', name: 'Artificial Intelligence', school: 'School of Artificial Intelligence', blocks: ['B', 'E'], facultyCount: 5 },
  { id: 'Mathematics', name: 'Mathematics', school: 'Sciences', blocks: ['E'], facultyCount: 4 },
  { id: 'Chemistry', name: 'Chemistry', school: 'Sciences', blocks: ['D'], facultyCount: 6 },
  { id: 'Physics', name: 'Physics', school: 'Sciences', blocks: ['D'], facultyCount: 1 },
  { id: 'English', name: 'English & Cultural Education', school: 'Humanities', blocks: ['E'], facultyCount: 5 },
  { id: 'SoE', name: 'School of Engineering (General)', school: 'School of Engineering', blocks: ['E'], facultyCount: 9 },
];

export const CAMPUS_FEATURES = [
  'Campus map with buildings, blocks, and roads',
  'Blocks A–E with floor plans and rooms',
  'Search for buildings, rooms, and faculty',
  'Find halls and library',
  'Walking directions across campus',
  'Indoor directions to rooms',
  'Pin any location for reporting',
  'Campus issues shown on map',
  'Clean and easy to use',
];
