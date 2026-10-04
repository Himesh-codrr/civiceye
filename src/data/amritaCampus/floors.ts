export const CAMPUS_FLOORS = {
  "buildings": {
    "a": {
      "name": "Block A",
      "verified": false,
      "floors": [
        {
          "id": "a-g",
          "name": "Ground Floor",
          "width": 1000,
          "height": 460,
          "outline": "M20,20 L980,20 L980,440 L20,440 Z",
          "corridors": [
            {
              "d": "M40,280 L960,280 L960,320 L40,320 Z"
            }
          ],
          "nodes": [
            {
              "id": "n0",
              "x": 70,
              "y": 300
            },
            {
              "id": "n1",
              "x": 250,
              "y": 300
            },
            {
              "id": "n2",
              "x": 430,
              "y": 300
            },
            {
              "id": "n3",
              "x": 610,
              "y": 300
            },
            {
              "id": "n4",
              "x": 790,
              "y": 300
            },
            {
              "id": "n5",
              "x": 930,
              "y": 300
            }
          ],
          "edges": [
            [
              "n0",
              "n1"
            ],
            [
              "n1",
              "n2"
            ],
            [
              "n2",
              "n3"
            ],
            [
              "n3",
              "n4"
            ],
            [
              "n4",
              "n5"
            ]
          ],
          "spaces": [
            {
              "id": "d-a-g-0",
              "type": "admin",
              "label": "A-G1",
              "name": "Examination Office",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n0"
            },
            {
              "id": "d-a-g-1",
              "type": "admin",
              "label": "A-G2",
              "name": "Accounts Office",
              "shape": "rect",
              "x": 220,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n1"
            },
            {
              "id": "d-a-g-2",
              "type": "admin",
              "label": "A-G3",
              "name": "Training & Placement Cell",
              "shape": "rect",
              "x": 414,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n2"
            },
            {
              "id": "d-a-g-3",
              "type": "classroom",
              "label": "A-G4",
              "name": "Classroom (80, wooden door)",
              "shape": "rect",
              "x": 608,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n3",
              "capacity": 80
            },
            {
              "id": "d-a-g-4",
              "type": "classroom",
              "label": "A-G5",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 802,
              "y": 26,
              "w": 150,
              "h": 130,
              "node": "n4",
              "capacity": 80
            },
            {
              "id": "d-a-g-5",
              "type": "office",
              "label": "A-G6",
              "name": "EEE Faculty Room 1",
              "shape": "rect",
              "x": 26,
              "y": 170,
              "w": 200,
              "h": 130,
              "node": "n0",
              "meta": {
                "Department": "EEE"
              },
              "seats": [
                {
                  "id": "d-a-g-D-G7-0",
                  "x": 239,
                  "y": 248,
                  "desk": "A-G7-01",
                  "person": "Dr. J. Ramprabhakar",
                  "role": "Vice Chairperson",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/j-ramprabhakar"
                },
                {
                  "id": "d-a-g-D-G7-1",
                  "x": 273,
                  "y": 248,
                  "desk": "A-G7-02",
                  "person": "Dr. K. Deepa",
                  "role": "Professor",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/k-deepa"
                },
                {
                  "id": "d-a-g-D-G7-2",
                  "x": 307,
                  "y": 248,
                  "desk": "A-G7-03",
                  "person": "Dr. Rashmi M. R.",
                  "role": "Professor",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/rashmi-m-r"
                },
                {
                  "id": "d-a-g-D-G7-3",
                  "x": 341,
                  "y": 248,
                  "desk": "A-G7-04",
                  "person": "Dr. Vidya H. A.",
                  "role": "Chairperson",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/vidya-h-a"
                },
                {
                  "id": "d-a-g-D-G7-4",
                  "x": 375,
                  "y": 248,
                  "desk": "A-G7-05",
                  "person": "Dr. M. Nithya",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/m-nithya"
                },
                {
                  "id": "d-a-g-D-G7-5",
                  "x": 239,
                  "y": 284,
                  "desk": "A-G7-06",
                  "person": "Dr. Manitha P. V.",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/manitha-p-v"
                },
                {
                  "id": "d-a-g-D-G7-6",
                  "x": 273,
                  "y": 284,
                  "desk": "A-G7-07",
                  "person": "Dr. Mini Sujith",
                  "role": "Associate Professor",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/mini-sujith"
                },
                {
                  "id": "d-a-g-D-G7-7",
                  "x": 307,
                  "y": 284,
                  "desk": "A-G7-08",
                  "person": "Dr. Sujit Kumar",
                  "role": "Assistant Professor",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/sujit-kumar"
                },
                {
                  "id": "d-a-g-D-G7-8",
                  "x": 341,
                  "y": 284,
                  "desk": "A-G7-09",
                  "person": "Dr. Surekha P.",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/surekha-p"
                }
              ]
            },
            {
              "id": "d-a-g-6",
              "type": "classroom",
              "label": "A-G7",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 240,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 80
            },
            {
              "id": "d-a-g-7",
              "type": "support",
              "label": "A-G8",
              "name": "Utility + Drinking Water",
              "shape": "rect",
              "x": 434,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n2"
            },
            {
              "id": "d-a-g-8",
              "type": "support",
              "label": "A-G9",
              "name": "Store + WiFi",
              "shape": "rect",
              "x": 628,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n3"
            },
            {
              "id": "d-a-g-9",
              "type": "office",
              "label": "A-G10",
              "name": "CSE/AIE Faculty Overflow",
              "shape": "rect",
              "x": 822,
              "y": 170,
              "w": 150,
              "h": 130,
              "node": "n4",
              "meta": {
                "Department": "CSE"
              },
              "seats": [
                {
                  "id": "d-a-g-CSE-11-0",
                  "x": 817,
                  "y": 248,
                  "desk": "A-G11-01",
                  "person": "Divya K V",
                  "role": "Assistant Professor (OC)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/divya-k-v/"
                },
                {
                  "id": "d-a-g-CSE-11-1",
                  "x": 847,
                  "y": 248,
                  "desk": "A-G11-02",
                  "person": "Pooja Gowda",
                  "role": "Assistant Professor (OC)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/pooja-gowda/"
                },
                {
                  "id": "d-a-g-CSE-11-2",
                  "x": 877,
                  "y": 248,
                  "desk": "A-G11-03",
                  "person": "Shalini Tiwari",
                  "role": "Assistant Professor (OC)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/shalini-tiwari/"
                },
                {
                  "id": "d-a-g-CSE-11-3",
                  "x": 817,
                  "y": 284,
                  "desk": "A-G11-04",
                  "person": "Neera Chaudhary",
                  "role": "Assistant Professor (OC)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/neera-chaudhary/"
                },
                {
                  "id": "d-a-g-CSE-11-4",
                  "x": 847,
                  "y": 284,
                  "desk": "A-G11-05",
                  "person": "Arya Suresh",
                  "role": "Assistant Professor (OC)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/arya-suresh/"
                },
                {
                  "id": "d-a-g-CSE-11-5",
                  "x": 877,
                  "y": 284,
                  "desk": "A-G11-06",
                  "person": "Penki Lavanya",
                  "role": "Assistant Professor (OC)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/p-lavanya/"
                }
              ]
            },
            {
              "id": "d-a-g-st",
              "type": "stairs",
              "label": "Stairs",
              "name": "Staircase with Amma photo",
              "shape": "rect",
              "x": 465,
              "y": 340,
              "w": 70,
              "h": 50,
              "node": "n2"
            },
            {
              "id": "d-a-g-wc",
              "type": "restroom",
              "label": "WC",
              "name": "Restrooms",
              "shape": "rect",
              "x": 850,
              "y": 340,
              "w": 66,
              "h": 50,
              "node": "n5"
            },
            {
              "id": "d-a-g-ent",
              "type": "entrance",
              "label": "Entrance",
              "name": "A Block Entrance",
              "shape": "rect",
              "x": 90,
              "y": 340,
              "w": 110,
              "h": 50,
              "node": "n0"
            }
          ]
        },
        {
          "id": "a-1",
          "name": "First Floor",
          "width": 1000,
          "height": 460,
          "outline": "M20,20 L980,20 L980,440 L20,440 Z",
          "corridors": [
            {
              "d": "M40,280 L960,280 L960,320 L40,320 Z"
            }
          ],
          "nodes": [
            {
              "id": "n0",
              "x": 70,
              "y": 300
            },
            {
              "id": "n1",
              "x": 250,
              "y": 300
            },
            {
              "id": "n2",
              "x": 430,
              "y": 300
            },
            {
              "id": "n3",
              "x": 610,
              "y": 300
            },
            {
              "id": "n4",
              "x": 790,
              "y": 300
            },
            {
              "id": "n5",
              "x": 930,
              "y": 300
            }
          ],
          "edges": [
            [
              "n0",
              "n1"
            ],
            [
              "n1",
              "n2"
            ],
            [
              "n2",
              "n3"
            ],
            [
              "n3",
              "n4"
            ],
            [
              "n4",
              "n5"
            ]
          ],
          "spaces": [
            {
              "id": "d-a-1-0",
              "type": "lab",
              "label": "A-101",
              "name": "Computer Centre (24/7)",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n0",
              "capacity": 80
            },
            {
              "id": "d-a-1-1",
              "type": "lab",
              "label": "A-102",
              "name": "Internet Lab 50 nodes real",
              "shape": "rect",
              "x": 220,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 50
            },
            {
              "id": "d-a-1-2",
              "type": "admin",
              "label": "A-103",
              "name": "ICTS / NOC",
              "shape": "rect",
              "x": 414,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n2"
            },
            {
              "id": "d-a-1-3",
              "type": "classroom",
              "label": "A-104",
              "name": "Classroom",
              "shape": "rect",
              "x": 608,
              "y": 26,
              "w": 200,
              "h": 130,
              "node": "n3",
              "capacity": 80
            },
            {
              "id": "d-a-1-4",
              "type": "classroom",
              "label": "Indo-US",
              "name": "Classroom",
              "shape": "rect",
              "x": 822,
              "y": 26,
              "w": 150,
              "h": 130,
              "node": "n4",
              "capacity": 80
            },
            {
              "id": "d-a-1-5",
              "type": "office",
              "label": "A-106",
              "name": "EEE Faculty Room 2",
              "shape": "rect",
              "x": 26,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n0",
              "meta": {
                "Department": "EEE"
              },
              "seats": [
                {
                  "id": "d-a-1-D-106-0",
                  "x": 47,
                  "y": 248,
                  "desk": "A-106-01",
                  "person": "Dr. Syama S.",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/s-syama"
                },
                {
                  "id": "d-a-1-D-106-1",
                  "x": 92,
                  "y": 248,
                  "desk": "A-106-02",
                  "person": "Dr. V. S. Kirthika Devi",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/s-kirthika"
                },
                {
                  "id": "d-a-1-D-106-2",
                  "x": 138,
                  "y": 248,
                  "desk": "A-106-03",
                  "person": "K. Sireesha",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/k-sireesha"
                },
                {
                  "id": "d-a-1-D-106-3",
                  "x": 183,
                  "y": 248,
                  "desk": "A-106-04",
                  "person": "K. Vishnu Raj",
                  "role": "Assistant Professor (OC)",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/k-vishnu-raj"
                },
                {
                  "id": "d-a-1-D-106-4",
                  "x": 47,
                  "y": 284,
                  "desk": "A-106-05",
                  "person": "Kruthika U.",
                  "role": "Assistant Professor (OC)",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/kruthika-u"
                },
                {
                  "id": "d-a-1-D-106-5",
                  "x": 92,
                  "y": 284,
                  "desk": "A-106-06",
                  "person": "Lekshmi S.",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/s-lekshmi"
                },
                {
                  "id": "d-a-1-D-106-6",
                  "x": 138,
                  "y": 284,
                  "desk": "A-106-07",
                  "person": "Sudha Yadav",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/sy-sudha"
                },
                {
                  "id": "d-a-1-D-106-7",
                  "x": 183,
                  "y": 284,
                  "desk": "A-106-08",
                  "person": "V. Sailaja",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "EEE",
                  "url": "https://www.amrita.edu/faculty/v-sailaja"
                }
              ]
            },
            {
              "id": "d-a-1-6",
              "type": "classroom",
              "label": "A-107",
              "name": "Classroom",
              "shape": "rect",
              "x": 220,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 80
            },
            {
              "id": "d-a-1-7",
              "type": "classroom",
              "label": "A-108",
              "name": "Classroom",
              "shape": "rect",
              "x": 414,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n2",
              "capacity": 80
            },
            {
              "id": "d-a-1-8",
              "type": "support",
              "label": "A-109",
              "name": "Drinking Water + Notice Boards",
              "shape": "rect",
              "x": 608,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n3"
            },
            {
              "id": "d-a-1-9",
              "type": "classroom",
              "label": "A-110",
              "name": "Classroom",
              "shape": "rect",
              "x": 802,
              "y": 170,
              "w": 170,
              "h": 130,
              "node": "n4",
              "capacity": 80
            },
            {
              "id": "d-a-1-st",
              "type": "stairs",
              "label": "Stairs",
              "name": "Staircase with Amma photo",
              "shape": "rect",
              "x": 465,
              "y": 340,
              "w": 70,
              "h": 50,
              "node": "n2"
            },
            {
              "id": "d-a-1-wc",
              "type": "restroom",
              "label": "WC",
              "name": "Restrooms",
              "shape": "rect",
              "x": 850,
              "y": 340,
              "w": 66,
              "h": 50,
              "node": "n5"
            }
          ]
        },
        {
          "id": "a-2",
          "name": "Second Floor",
          "width": 1000,
          "height": 460,
          "outline": "M20,20 L980,20 L980,440 L20,440 Z",
          "corridors": [
            {
              "d": "M40,280 L960,280 L960,320 L40,320 Z"
            }
          ],
          "nodes": [
            {
              "id": "n0",
              "x": 70,
              "y": 300
            },
            {
              "id": "n1",
              "x": 250,
              "y": 300
            },
            {
              "id": "n2",
              "x": 430,
              "y": 300
            },
            {
              "id": "n3",
              "x": 610,
              "y": 300
            },
            {
              "id": "n4",
              "x": 790,
              "y": 300
            },
            {
              "id": "n5",
              "x": 930,
              "y": 300
            }
          ],
          "edges": [
            [
              "n0",
              "n1"
            ],
            [
              "n1",
              "n2"
            ],
            [
              "n2",
              "n3"
            ],
            [
              "n3",
              "n4"
            ],
            [
              "n4",
              "n5"
            ]
          ],
          "spaces": [
            {
              "id": "d-a-2-0",
              "type": "classroom",
              "label": "A-201",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n0",
              "capacity": 80
            },
            {
              "id": "d-a-2-1",
              "type": "classroom",
              "label": "A-202",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 220,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 80
            },
            {
              "id": "d-a-2-2",
              "type": "lab",
              "label": "A-203",
              "name": "Research Lab",
              "shape": "rect",
              "x": 414,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n2",
              "capacity": 30
            },
            {
              "id": "d-a-2-3",
              "type": "office",
              "label": "A-204",
              "name": "ECE Faculty Room 4",
              "shape": "rect",
              "x": 608,
              "y": 26,
              "w": 200,
              "h": 130,
              "node": "n3",
              "meta": {
                "Department": "ECE"
              },
              "seats": [
                {
                  "id": "d-a-2-D-204-0",
                  "x": 624,
                  "y": 97,
                  "desk": "A-204-01",
                  "person": "Dr. Vivek Venugopal",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/vivekvenugopal"
                },
                {
                  "id": "d-a-2-D-204-1",
                  "x": 658,
                  "y": 97,
                  "desk": "A-204-02",
                  "person": "Gayathri R.",
                  "role": "Assistant Professor (OC)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/gayathri-r"
                },
                {
                  "id": "d-a-2-D-204-2",
                  "x": 692,
                  "y": 97,
                  "desk": "A-204-03",
                  "person": "Giriraja C. V.",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/cv-giriraja"
                },
                {
                  "id": "d-a-2-D-204-3",
                  "x": 726,
                  "y": 97,
                  "desk": "A-204-04",
                  "person": "Jayashree M. Oli",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/jayashree-m"
                },
                {
                  "id": "d-a-2-D-204-4",
                  "x": 760,
                  "y": 97,
                  "desk": "A-204-05",
                  "person": "Kirti S. Pande",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/sp-kirti"
                },
                {
                  "id": "d-a-2-D-204-5",
                  "x": 624,
                  "y": 133,
                  "desk": "A-204-06",
                  "person": "Priya B. K.",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/bk-priya"
                },
                {
                  "id": "d-a-2-D-204-6",
                  "x": 658,
                  "y": 133,
                  "desk": "A-204-07",
                  "person": "Sagar B.",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/b-sagar"
                },
                {
                  "id": "d-a-2-D-204-7",
                  "x": 692,
                  "y": 133,
                  "desk": "A-204-08",
                  "person": "Sonali Agrawal",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/a-sonali"
                },
                {
                  "id": "d-a-2-D-204-8",
                  "x": 726,
                  "y": 133,
                  "desk": "A-204-09",
                  "person": "Swaminadhan Rajula",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/r-swaminadhan"
                },
                {
                  "id": "d-a-2-D-204-9",
                  "x": 760,
                  "y": 133,
                  "desk": "A-204-10",
                  "person": "Vignesh V.",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/v-vignesh"
                }
              ]
            },
            {
              "id": "d-a-2-4",
              "type": "office",
              "label": "A-205",
              "name": "HoD Office \u2014 ECE",
              "shape": "rect",
              "x": 822,
              "y": 26,
              "w": 150,
              "h": 130,
              "node": "n4"
            },
            {
              "id": "d-a-2-5",
              "type": "classroom",
              "label": "A-206",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 26,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n0",
              "capacity": 80
            },
            {
              "id": "d-a-2-6",
              "type": "classroom",
              "label": "A-207",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 220,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 80
            },
            {
              "id": "d-a-2-7",
              "type": "lab",
              "label": "A-208",
              "name": "Project Lab",
              "shape": "rect",
              "x": 414,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n2",
              "capacity": 40
            },
            {
              "id": "d-a-2-8",
              "type": "support",
              "label": "A-209",
              "name": "Utility + Drinking Water",
              "shape": "rect",
              "x": 608,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n3"
            },
            {
              "id": "d-a-2-9",
              "type": "support",
              "label": "A-210",
              "name": "Store",
              "shape": "rect",
              "x": 802,
              "y": 170,
              "w": 170,
              "h": 130,
              "node": "n4"
            },
            {
              "id": "d-a-2-st",
              "type": "stairs",
              "label": "Stairs",
              "name": "Staircase",
              "shape": "rect",
              "x": 465,
              "y": 340,
              "w": 70,
              "h": 50,
              "node": "n2"
            },
            {
              "id": "d-a-2-wc",
              "type": "restroom",
              "label": "WC",
              "name": "Restrooms",
              "shape": "rect",
              "x": 850,
              "y": 340,
              "w": 66,
              "h": 50,
              "node": "n5"
            }
          ]
        }
      ]
    },
    "b": {
      "name": "Block B",
      "verified": false,
      "floors": [
        {
          "id": "b-g",
          "name": "Ground Floor",
          "width": 1000,
          "height": 460,
          "outline": "M20,20 L980,20 L980,440 L20,440 Z",
          "corridors": [
            {
              "d": "M40,280 L960,280 L960,320 L40,320 Z"
            }
          ],
          "nodes": [
            {
              "id": "n0",
              "x": 70,
              "y": 300
            },
            {
              "id": "n1",
              "x": 250,
              "y": 300
            },
            {
              "id": "n2",
              "x": 430,
              "y": 300
            },
            {
              "id": "n3",
              "x": 610,
              "y": 300
            },
            {
              "id": "n4",
              "x": 790,
              "y": 300
            },
            {
              "id": "n5",
              "x": 930,
              "y": 300
            }
          ],
          "edges": [
            [
              "n0",
              "n1"
            ],
            [
              "n1",
              "n2"
            ],
            [
              "n2",
              "n3"
            ],
            [
              "n3",
              "n4"
            ],
            [
              "n4",
              "n5"
            ]
          ],
          "spaces": [
            {
              "id": "c-b-g-0",
              "type": "lab",
              "label": "B-G1",
              "name": "Electronics Lab",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n0",
              "capacity": 40
            },
            {
              "id": "c-b-g-1",
              "type": "lab",
              "label": "B-G2",
              "name": "Microprocessor Lab",
              "shape": "rect",
              "x": 220,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 40
            },
            {
              "id": "c-b-g-2",
              "type": "lab",
              "label": "B-G3",
              "name": "Communication Lab",
              "shape": "rect",
              "x": 414,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n2",
              "capacity": 40
            },
            {
              "id": "c-b-g-3",
              "type": "classroom",
              "label": "B-G4",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 608,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n3",
              "capacity": 80
            },
            {
              "id": "c-b-g-4",
              "type": "classroom",
              "label": "B-G5",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 802,
              "y": 26,
              "w": 150,
              "h": 130,
              "node": "n4",
              "capacity": 80
            },
            {
              "id": "c-b-g-5",
              "type": "office",
              "label": "B-G6",
              "name": "ECE Faculty Room 1",
              "shape": "rect",
              "x": 26,
              "y": 170,
              "w": 200,
              "h": 130,
              "node": "n0",
              "meta": {
                "Department": "ECE"
              },
              "seats": [
                {
                  "id": "c-b-g-C-G7-0",
                  "x": 239,
                  "y": 248,
                  "desk": "B-G7-01",
                  "person": "Dr. M. Vinodhini",
                  "role": "Vice Chairperson",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/m-vinodhini"
                },
                {
                  "id": "c-b-g-C-G7-1",
                  "x": 273,
                  "y": 248,
                  "desk": "B-G7-02",
                  "person": "Dr. Navin Kumar",
                  "role": "Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/k-navin"
                },
                {
                  "id": "c-b-g-C-G7-2",
                  "x": 307,
                  "y": 248,
                  "desk": "B-G7-03",
                  "person": "Dr. T. K. Ramesh",
                  "role": "Chairperson",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/tk-ramesh"
                },
                {
                  "id": "c-b-g-C-G7-3",
                  "x": 341,
                  "y": 248,
                  "desk": "B-G7-04",
                  "person": "Late Dr. Dhanesh G. Kurup (Memorial Page)",
                  "role": "Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/dg-kurup"
                },
                {
                  "id": "c-b-g-C-G7-4",
                  "x": 375,
                  "y": 248,
                  "desk": "B-G7-05",
                  "person": "Dr. Anusaya Swain",
                  "role": "Assistant Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/anusaya-swain"
                },
                {
                  "id": "c-b-g-C-G7-5",
                  "x": 239,
                  "y": 284,
                  "desk": "B-G7-06",
                  "person": "Dr. Ashish Goswami",
                  "role": "Assistant Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/ashish-goswami"
                },
                {
                  "id": "c-b-g-C-G7-6",
                  "x": 273,
                  "y": 284,
                  "desk": "B-G7-07",
                  "person": "Dr. Bhavana V.",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/v-bhavana"
                },
                {
                  "id": "c-b-g-C-G7-7",
                  "x": 307,
                  "y": 284,
                  "desk": "B-G7-08",
                  "person": "Dr. Chinthala Ramesh",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/c-ramesh"
                },
                {
                  "id": "c-b-g-C-G7-8",
                  "x": 341,
                  "y": 284,
                  "desk": "B-G7-09",
                  "person": "Dr. Ganapathi Hegde",
                  "role": "Associate Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/ganapathi-hedge"
                },
                {
                  "id": "c-b-g-C-G7-9",
                  "x": 375,
                  "y": 284,
                  "desk": "B-G7-10",
                  "person": "Dr. Harshit Srivastava",
                  "role": "Assistant Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/harshit-srivastava"
                }
              ]
            },
            {
              "id": "c-b-g-6",
              "type": "office",
              "label": "B-G7",
              "name": "CSE Faculty Room 1",
              "shape": "rect",
              "x": 240,
              "y": 170,
              "w": 200,
              "h": 130,
              "node": "n1",
              "meta": {
                "Department": "CSE"
              },
              "seats": [
                {
                  "id": "c-b-g-CSE-G11-0",
                  "x": 47,
                  "y": 248,
                  "desk": "B-G11-01",
                  "person": "Dr. Vineetha Jain K. V.",
                  "role": "Vice Chairperson, Assistant Professor (Sl. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/jain-vineetha/"
                },
                {
                  "id": "c-b-g-CSE-G11-1",
                  "x": 81,
                  "y": 248,
                  "desk": "B-G11-02",
                  "person": "Dr. Sreevidya B.",
                  "role": "Vice Chairperson, Assistant Professor (Sr. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/b-sreevidya/"
                },
                {
                  "id": "c-b-g-CSE-G11-2",
                  "x": 115,
                  "y": 248,
                  "desk": "B-G11-03",
                  "person": "Dr. Peeta Basa Pati",
                  "role": "Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/peeta-pati/"
                },
                {
                  "id": "c-b-g-CSE-G11-3",
                  "x": 149,
                  "y": 248,
                  "desk": "B-G11-04",
                  "person": "Dr. Amudha J.",
                  "role": "Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/j-amudha/"
                },
                {
                  "id": "c-b-g-CSE-G11-4",
                  "x": 183,
                  "y": 248,
                  "desk": "B-G11-05",
                  "person": "Dr. Deepa Gupta",
                  "role": "Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/dr-deepa-gupta/"
                },
                {
                  "id": "c-b-g-CSE-G11-5",
                  "x": 47,
                  "y": 284,
                  "desk": "B-G11-06",
                  "person": "Dr. Supriya M.",
                  "role": "Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/m-supriya/"
                },
                {
                  "id": "c-b-g-CSE-G11-6",
                  "x": 81,
                  "y": 284,
                  "desk": "B-G11-07",
                  "person": "Dr. Suja P.",
                  "role": "Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/p-suja/"
                },
                {
                  "id": "c-b-g-CSE-G11-7",
                  "x": 115,
                  "y": 284,
                  "desk": "B-G11-08",
                  "person": "Dr. Beena B. M.",
                  "role": "Associate Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/beena-bm/"
                },
                {
                  "id": "c-b-g-CSE-G11-8",
                  "x": 149,
                  "y": 284,
                  "desk": "B-G11-09",
                  "person": "Dr. Manju Khanna",
                  "role": "Associate Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/manju-khanna/"
                },
                {
                  "id": "c-b-g-CSE-G11-9",
                  "x": 183,
                  "y": 284,
                  "desk": "B-G11-10",
                  "person": "Dr. Tripty Singh",
                  "role": "Associate Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/tripty-singh/"
                }
              ]
            },
            {
              "id": "c-b-g-7",
              "type": "classroom",
              "label": "B-G8",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 454,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n2",
              "capacity": 80
            },
            {
              "id": "c-b-g-8",
              "type": "support",
              "label": "B-G9",
              "name": "Lab Store",
              "shape": "rect",
              "x": 648,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n3"
            },
            {
              "id": "c-b-g-9",
              "type": "support",
              "label": "B-G10",
              "name": "Utility + Drinking Water",
              "shape": "rect",
              "x": 842,
              "y": 170,
              "w": 130,
              "h": 130,
              "node": "n4"
            },
            {
              "id": "c-b-g-st",
              "type": "stairs",
              "label": "Stairs",
              "name": "Staircase",
              "shape": "rect",
              "x": 465,
              "y": 340,
              "w": 70,
              "h": 50,
              "node": "n2"
            },
            {
              "id": "c-b-g-wc",
              "type": "restroom",
              "label": "WC",
              "name": "Restrooms",
              "shape": "rect",
              "x": 850,
              "y": 340,
              "w": 66,
              "h": 50,
              "node": "n5"
            },
            {
              "id": "c-b-g-ent",
              "type": "entrance",
              "label": "Entrance",
              "name": "B Block Entrance",
              "shape": "rect",
              "x": 90,
              "y": 340,
              "w": 110,
              "h": 50,
              "node": "n0"
            }
          ]
        },
        {
          "id": "b-1",
          "name": "First Floor",
          "width": 1000,
          "height": 460,
          "outline": "M20,20 L980,20 L980,440 L20,440 Z",
          "corridors": [
            {
              "d": "M40,280 L960,280 L960,320 L40,320 Z"
            }
          ],
          "nodes": [
            {
              "id": "n0",
              "x": 70,
              "y": 300
            },
            {
              "id": "n1",
              "x": 250,
              "y": 300
            },
            {
              "id": "n2",
              "x": 430,
              "y": 300
            },
            {
              "id": "n3",
              "x": 610,
              "y": 300
            },
            {
              "id": "n4",
              "x": 790,
              "y": 300
            },
            {
              "id": "n5",
              "x": 930,
              "y": 300
            }
          ],
          "edges": [
            [
              "n0",
              "n1"
            ],
            [
              "n1",
              "n2"
            ],
            [
              "n2",
              "n3"
            ],
            [
              "n3",
              "n4"
            ],
            [
              "n4",
              "n5"
            ]
          ],
          "spaces": [
            {
              "id": "c-b-1-0",
              "type": "lab",
              "label": "B-101",
              "name": "Computer Lab 3 (60)",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n0",
              "capacity": 60
            },
            {
              "id": "c-b-1-1",
              "type": "lab",
              "label": "B-102",
              "name": "AI / ML Lab (40)",
              "shape": "rect",
              "x": 220,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 40
            },
            {
              "id": "c-b-1-2",
              "type": "lab",
              "label": "B-103",
              "name": "Networks Lab (40)",
              "shape": "rect",
              "x": 414,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n2",
              "capacity": 40
            },
            {
              "id": "c-b-1-3",
              "type": "classroom",
              "label": "B-104",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 608,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n3",
              "capacity": 80
            },
            {
              "id": "c-b-1-4",
              "type": "classroom",
              "label": "B-105",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 802,
              "y": 26,
              "w": 150,
              "h": 130,
              "node": "n4",
              "capacity": 80
            },
            {
              "id": "c-b-1-5",
              "type": "office",
              "label": "B-106",
              "name": "ECE Faculty Room 2",
              "shape": "rect",
              "x": 26,
              "y": 170,
              "w": 200,
              "h": 130,
              "node": "n0",
              "meta": {
                "Department": "ECE"
              },
              "seats": [
                {
                  "id": "c-b-1-C-106-0",
                  "x": 47,
                  "y": 248,
                  "desk": "B-106-01",
                  "person": "Dr. Jitendra Bahadur",
                  "role": "Assistant Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/jitendra-bahadur"
                },
                {
                  "id": "c-b-1-C-106-1",
                  "x": 81,
                  "y": 248,
                  "desk": "B-106-02",
                  "person": "Dr. Karnena Rohit Kumar",
                  "role": "Assistant Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/karnena-rohit-kumar"
                },
                {
                  "id": "c-b-1-C-106-2",
                  "x": 115,
                  "y": 248,
                  "desk": "B-106-03",
                  "person": "Dr. Kaveri Hatti",
                  "role": "Assistant Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/kaveri-hatti"
                },
                {
                  "id": "c-b-1-C-106-3",
                  "x": 149,
                  "y": 248,
                  "desk": "B-106-04",
                  "person": "Dr. Manoj Kumar Panda",
                  "role": "Associate Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/manoj-kumar-panda"
                },
                {
                  "id": "c-b-1-C-106-4",
                  "x": 183,
                  "y": 248,
                  "desk": "B-106-05",
                  "person": "Dr. Nizampatnam Neelima",
                  "role": "Associate Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/n-neelima"
                },
                {
                  "id": "c-b-1-C-106-5",
                  "x": 47,
                  "y": 284,
                  "desk": "B-106-06",
                  "person": "Dr. Paramasivam C.",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/c-paramasivam"
                },
                {
                  "id": "c-b-1-C-106-6",
                  "x": 81,
                  "y": 284,
                  "desk": "B-106-07",
                  "person": "Dr. Parul Mathur",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/p-mathur"
                },
                {
                  "id": "c-b-1-C-106-7",
                  "x": 115,
                  "y": 284,
                  "desk": "B-106-08",
                  "person": "Dr. Patthi Aruna",
                  "role": "Assistant Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/patthi-aruna"
                },
                {
                  "id": "c-b-1-C-106-8",
                  "x": 149,
                  "y": 284,
                  "desk": "B-106-09",
                  "person": "Dr. Phani Raj Harivanam",
                  "role": "Assistant Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/phani-raj-harivanam"
                },
                {
                  "id": "c-b-1-C-106-9",
                  "x": 183,
                  "y": 284,
                  "desk": "B-106-10",
                  "person": "Dr. Priti Mandal",
                  "role": "Assistant Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/priti-mandal"
                }
              ]
            },
            {
              "id": "c-b-1-6",
              "type": "office",
              "label": "B-107",
              "name": "HoD Office \u2014 CSE",
              "shape": "rect",
              "x": 240,
              "y": 170,
              "w": 200,
              "h": 130,
              "node": "n1"
            },
            {
              "id": "c-b-1-7",
              "type": "classroom",
              "label": "B-108",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 454,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n2",
              "capacity": 80
            },
            {
              "id": "c-b-1-8",
              "type": "classroom",
              "label": "B-109",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 648,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n3",
              "capacity": 80
            },
            {
              "id": "c-b-1-9",
              "type": "support",
              "label": "B-110",
              "name": "Utility + Drinking Water",
              "shape": "rect",
              "x": 842,
              "y": 170,
              "w": 130,
              "h": 130,
              "node": "n4"
            },
            {
              "id": "c-b-1-10",
              "type": "office",
              "label": "B-111",
              "name": "CSE Faculty Room 2",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 200,
              "h": 130,
              "node": "n0",
              "meta": {
                "Department": "CSE"
              },
              "seats": [
                {
                  "id": "c-b-1-CSE-111-0",
                  "x": 817,
                  "y": 248,
                  "desk": "B-111-01",
                  "person": "Dr. B. Uma Maheswari",
                  "role": "Associate Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/b-uma/"
                },
                {
                  "id": "c-b-1-CSE-111-1",
                  "x": 851,
                  "y": 248,
                  "desk": "B-111-02",
                  "person": "Dr. Thangam S",
                  "role": "Associate Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/s-thangam/"
                },
                {
                  "id": "c-b-1-CSE-111-2",
                  "x": 885,
                  "y": 248,
                  "desk": "B-111-03",
                  "person": "Dr. S. Santhanalakshmi",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/s-lakshmi/"
                },
                {
                  "id": "c-b-1-CSE-111-3",
                  "x": 919,
                  "y": 248,
                  "desk": "B-111-04",
                  "person": "Dr. Manju Venugopalan",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/manju-venugopalan/"
                },
                {
                  "id": "c-b-1-CSE-111-4",
                  "x": 953,
                  "y": 248,
                  "desk": "B-111-05",
                  "person": "Dr. Kumaran U.",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/kumaran-u/"
                },
                {
                  "id": "c-b-1-CSE-111-5",
                  "x": 817,
                  "y": 284,
                  "desk": "B-111-06",
                  "person": "Dr. Radha D.",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/d-radha/"
                },
                {
                  "id": "c-b-1-CSE-111-6",
                  "x": 851,
                  "y": 284,
                  "desk": "B-111-07",
                  "person": "Dr. Rimjhim Singh",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/dr-rimjhim-singh/"
                },
                {
                  "id": "c-b-1-CSE-111-7",
                  "x": 885,
                  "y": 284,
                  "desk": "B-111-08",
                  "person": "Dr. Meena Belwal",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/b-meena/"
                },
                {
                  "id": "c-b-1-CSE-111-8",
                  "x": 919,
                  "y": 284,
                  "desk": "B-111-09",
                  "person": "Dr. K Dinesh Kumar",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/dr-k-dinesh-kumar/"
                },
                {
                  "id": "c-b-1-CSE-111-9",
                  "x": 953,
                  "y": 284,
                  "desk": "B-111-10",
                  "person": "Dr. Gurupriya M.",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/gurupriya-m/"
                }
              ]
            },
            {
              "id": "c-b-1-st",
              "type": "stairs",
              "label": "Stairs",
              "name": "Staircase",
              "shape": "rect",
              "x": 465,
              "y": 340,
              "w": 70,
              "h": 50,
              "node": "n2"
            },
            {
              "id": "c-b-1-wc",
              "type": "restroom",
              "label": "WC",
              "name": "Restrooms",
              "shape": "rect",
              "x": 850,
              "y": 340,
              "w": 66,
              "h": 50,
              "node": "n5"
            }
          ]
        },
        {
          "id": "b-2",
          "name": "Second Floor",
          "width": 1000,
          "height": 460,
          "outline": "M20,20 L980,20 L980,440 L20,440 Z",
          "corridors": [
            {
              "d": "M40,280 L960,280 L960,320 L40,320 Z"
            }
          ],
          "nodes": [
            {
              "id": "n0",
              "x": 70,
              "y": 300
            },
            {
              "id": "n1",
              "x": 250,
              "y": 300
            },
            {
              "id": "n2",
              "x": 430,
              "y": 300
            },
            {
              "id": "n3",
              "x": 610,
              "y": 300
            },
            {
              "id": "n4",
              "x": 790,
              "y": 300
            },
            {
              "id": "n5",
              "x": 930,
              "y": 300
            }
          ],
          "edges": [
            [
              "n0",
              "n1"
            ],
            [
              "n1",
              "n2"
            ],
            [
              "n2",
              "n3"
            ],
            [
              "n3",
              "n4"
            ],
            [
              "n4",
              "n5"
            ]
          ],
          "spaces": [
            {
              "id": "c-b-2-0",
              "type": "classroom",
              "label": "B-201",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n0",
              "capacity": 80
            },
            {
              "id": "c-b-2-1",
              "type": "classroom",
              "label": "B-202",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 220,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 80
            },
            {
              "id": "c-b-2-2",
              "type": "lab",
              "label": "B-203",
              "name": "Research Lab (30)",
              "shape": "rect",
              "x": 414,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n2",
              "capacity": 30
            },
            {
              "id": "c-b-2-3",
              "type": "lab",
              "label": "B-204",
              "name": "Research Lab (30)",
              "shape": "rect",
              "x": 608,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n3",
              "capacity": 30
            },
            {
              "id": "c-b-2-4",
              "type": "office",
              "label": "B-205",
              "name": "ECE Faculty Room 3",
              "shape": "rect",
              "x": 802,
              "y": 26,
              "w": 150,
              "h": 130,
              "node": "n4",
              "meta": {
                "Department": "ECE"
              },
              "seats": [
                {
                  "id": "c-b-2-C-205-0",
                  "x": 817,
                  "y": 97,
                  "desk": "B-205-01",
                  "person": "Dr. R. V. Sanjika Devi",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/r-sanjika"
                },
                {
                  "id": "c-b-2-C-205-1",
                  "x": 851,
                  "y": 97,
                  "desk": "B-205-02",
                  "person": "Dr. S. Lalitha",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/s-lalitha"
                },
                {
                  "id": "c-b-2-C-205-2",
                  "x": 885,
                  "y": 97,
                  "desk": "B-205-03",
                  "person": "Dr. Sarda Sharma",
                  "role": "Assistant Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/dr-sarada-sharma"
                },
                {
                  "id": "c-b-2-C-205-3",
                  "x": 919,
                  "y": 97,
                  "desk": "B-205-04",
                  "person": "Dr. Shivalila Hangaragi",
                  "role": "Assistant Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/shivalila-hangaragi"
                },
                {
                  "id": "c-b-2-C-205-4",
                  "x": 953,
                  "y": 97,
                  "desk": "B-205-05",
                  "person": "Dr. Sreeja Kochuvila",
                  "role": "Associate Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/k-sreeja"
                },
                {
                  "id": "c-b-2-C-205-5",
                  "x": 817,
                  "y": 133,
                  "desk": "B-205-06",
                  "person": "Dr. Sumathi S",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/sumathi-s"
                },
                {
                  "id": "c-b-2-C-205-6",
                  "x": 851,
                  "y": 133,
                  "desk": "B-205-07",
                  "person": "Dr. Sunitha R.",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/r-sunitha"
                },
                {
                  "id": "c-b-2-C-205-7",
                  "x": 885,
                  "y": 133,
                  "desk": "B-205-08",
                  "person": "Dr. Sushant Shendre",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/sushant-shendre"
                },
                {
                  "id": "c-b-2-C-205-8",
                  "x": 919,
                  "y": 133,
                  "desk": "B-205-09",
                  "person": "Dr. Sushma B.",
                  "role": "Assistant Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/sushma-b"
                },
                {
                  "id": "c-b-2-C-205-9",
                  "x": 953,
                  "y": 133,
                  "desk": "B-205-10",
                  "person": "Dr. Susmitha Vekkot",
                  "role": "Associate Professor",
                  "dept": "ECE",
                  "url": "https://www.amrita.edu/faculty/susmitha-vekkot"
                }
              ]
            },
            {
              "id": "c-b-2-5",
              "type": "classroom",
              "label": "B-206",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 26,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n0",
              "capacity": 80
            },
            {
              "id": "c-b-2-6",
              "type": "classroom",
              "label": "B-207",
              "name": "Tutorial Room (40)",
              "shape": "rect",
              "x": 220,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 40
            },
            {
              "id": "c-b-2-7",
              "type": "office",
              "label": "B-208",
              "name": "CSE Faculty Room 3 + AIE",
              "shape": "rect",
              "x": 414,
              "y": 170,
              "w": 200,
              "h": 130,
              "node": "n2",
              "meta": {
                "Department": "CSE/AIE"
              },
              "seats": [
                {
                  "id": "c-b-2-CSE-211-0",
                  "x": 432,
                  "y": 248,
                  "desk": "B-211-01",
                  "person": "Dr. Vishwas H. N.",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/hn-vishwas/"
                },
                {
                  "id": "c-b-2-CSE-211-1",
                  "x": 466,
                  "y": 248,
                  "desk": "B-211-02",
                  "person": "Dr. Nalini Sampath",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/s-nalini/"
                },
                {
                  "id": "c-b-2-CSE-211-2",
                  "x": 500,
                  "y": 248,
                  "desk": "B-211-03",
                  "person": "Sreebha Bhaskaran",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/b-sreebha/"
                },
                {
                  "id": "c-b-2-CSE-211-3",
                  "x": 534,
                  "y": 248,
                  "desk": "B-211-04",
                  "person": "Kavitha C. R.",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/cr-kavitha/"
                },
                {
                  "id": "c-b-2-CSE-211-4",
                  "x": 568,
                  "y": 248,
                  "desk": "B-211-05",
                  "person": "Dr. Priyanka Vivek",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/v-priyanka/"
                },
                {
                  "id": "c-b-2-CSE-211-5",
                  "x": 432,
                  "y": 284,
                  "desk": "B-211-06",
                  "person": "Dr. Rajesh M.",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/rajesh-m/"
                },
                {
                  "id": "c-b-2-CSE-211-6",
                  "x": 466,
                  "y": 284,
                  "desk": "B-211-07",
                  "person": "Sangita Khare",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/k-sangita/"
                },
                {
                  "id": "c-b-2-CSE-211-7",
                  "x": 500,
                  "y": 284,
                  "desk": "B-211-08",
                  "person": "Dr. Ullas S",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/s-ullas/"
                },
                {
                  "id": "c-b-2-CSE-211-8",
                  "x": 534,
                  "y": 284,
                  "desk": "B-211-09",
                  "person": "Dr. Shinu M. R.",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/shinu-mr/"
                },
                {
                  "id": "c-b-2-CSE-211-9",
                  "x": 568,
                  "y": 284,
                  "desk": "B-211-10",
                  "person": "Dr. Nandu C. Nair",
                  "role": "Assistant Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/nandu-c-nair/"
                }
              ]
            },
            {
              "id": "c-b-2-8",
              "type": "office",
              "label": "B-209",
              "name": "CSE Faculty Room 4",
              "shape": "rect",
              "x": 628,
              "y": 170,
              "w": 200,
              "h": 130,
              "node": "n3",
              "meta": {
                "Department": "CSE"
              },
              "seats": [
                {
                  "id": "c-b-2-CSE-212-0",
                  "x": 624,
                  "y": 97,
                  "desk": "B-212-01",
                  "person": "Dr. Nidhin Prabhakar T. V.",
                  "role": "Assistant Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/nidhin-prabhakar-t-v/"
                },
                {
                  "id": "c-b-2-CSE-212-1",
                  "x": 654,
                  "y": 97,
                  "desk": "B-212-02",
                  "person": "Dr. Gayathri Ramasamy",
                  "role": "Assistant Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/gayathri-ramasamy/"
                },
                {
                  "id": "c-b-2-CSE-212-2",
                  "x": 684,
                  "y": 97,
                  "desk": "B-212-03",
                  "person": "Dr. Reena Panwar",
                  "role": "Assistant Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/reena-panwar/"
                },
                {
                  "id": "c-b-2-CSE-212-3",
                  "x": 714,
                  "y": 97,
                  "desk": "B-212-04",
                  "person": "Dr. Sajitha Krishnan",
                  "role": "Assistant Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/sajitha-krishnan/"
                },
                {
                  "id": "c-b-2-CSE-212-4",
                  "x": 744,
                  "y": 97,
                  "desk": "B-212-05",
                  "person": "Dr. Daddala Yasoomkari",
                  "role": "Assistant Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/daddala-yasoomkari/"
                },
                {
                  "id": "c-b-2-CSE-212-5",
                  "x": 624,
                  "y": 133,
                  "desk": "B-212-06",
                  "person": "Dr. Sanghamitra Mishra",
                  "role": "Assistant Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/sanghamitra-mishra/"
                },
                {
                  "id": "c-b-2-CSE-212-6",
                  "x": 654,
                  "y": 133,
                  "desk": "B-212-07",
                  "person": "Dr. Amulyashree S",
                  "role": "Assistant Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/amulyashree-s/"
                },
                {
                  "id": "c-b-2-CSE-212-7",
                  "x": 684,
                  "y": 133,
                  "desk": "B-212-08",
                  "person": "Dr. Niharika Panda",
                  "role": "Assistant Professor",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/niharika-panda/"
                },
                {
                  "id": "c-b-2-CSE-212-8",
                  "x": 714,
                  "y": 133,
                  "desk": "B-212-09",
                  "person": "Niranjan D K",
                  "role": "Assistant Professor (OC)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/niranjan-d-k/"
                },
                {
                  "id": "c-b-2-CSE-212-9",
                  "x": 744,
                  "y": 133,
                  "desk": "B-212-10",
                  "person": "Aiswariya Milan K.",
                  "role": "Assistant Professor (OC)",
                  "dept": "CSE",
                  "url": "https://www.amrita.edu/faculty/aiswariya-milan-k/"
                }
              ]
            },
            {
              "id": "c-b-2-9",
              "type": "support",
              "label": "B-210",
              "name": "Utility + Drinking Water",
              "shape": "rect",
              "x": 842,
              "y": 170,
              "w": 130,
              "h": 130,
              "node": "n4"
            },
            {
              "id": "c-b-2-st",
              "type": "stairs",
              "label": "Stairs",
              "name": "Staircase",
              "shape": "rect",
              "x": 465,
              "y": 340,
              "w": 70,
              "h": 50,
              "node": "n2"
            },
            {
              "id": "c-b-2-wc",
              "type": "restroom",
              "label": "WC",
              "name": "Restrooms",
              "shape": "rect",
              "x": 850,
              "y": 340,
              "w": 66,
              "h": 50,
              "node": "n5"
            }
          ]
        }
      ]
    },
    "c": {
      "name": "Block C",
      "verified": false,
      "floors": [
        {
          "id": "c-g",
          "name": "Ground Floor",
          "width": 1000,
          "height": 460,
          "outline": "M20,20 L980,20 L980,440 L20,440 Z",
          "corridors": [
            {
              "d": "M40,280 L960,280 L960,320 L40,320 Z"
            }
          ],
          "nodes": [
            {
              "id": "n0",
              "x": 70,
              "y": 300
            },
            {
              "id": "n1",
              "x": 250,
              "y": 300
            },
            {
              "id": "n2",
              "x": 430,
              "y": 300
            },
            {
              "id": "n3",
              "x": 610,
              "y": 300
            },
            {
              "id": "n4",
              "x": 790,
              "y": 300
            },
            {
              "id": "n5",
              "x": 930,
              "y": 300
            }
          ],
          "edges": [
            [
              "n0",
              "n1"
            ],
            [
              "n1",
              "n2"
            ],
            [
              "n2",
              "n3"
            ],
            [
              "n3",
              "n4"
            ],
            [
              "n4",
              "n5"
            ]
          ],
          "spaces": [
            {
              "id": "b-c-g-0",
              "type": "lab",
              "label": "C-G1",
              "name": "Computer Lab 1 (60)",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n0",
              "capacity": 60
            },
            {
              "id": "b-c-g-1",
              "type": "lab",
              "label": "C-G2",
              "name": "Computer Lab 2 (60)",
              "shape": "rect",
              "x": 220,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 60
            },
            {
              "id": "b-c-g-2",
              "type": "classroom",
              "label": "C-G3",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 414,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n2",
              "capacity": 80
            },
            {
              "id": "b-c-g-3",
              "type": "classroom",
              "label": "C-G4",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 608,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n3",
              "capacity": 80
            },
            {
              "id": "b-c-g-4",
              "type": "classroom",
              "label": "C-G5",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 802,
              "y": 26,
              "w": 150,
              "h": 130,
              "node": "n4",
              "capacity": 80
            },
            {
              "id": "b-c-g-5",
              "type": "office",
              "label": "C-G6",
              "name": "Mechanical Faculty Room 1",
              "shape": "rect",
              "x": 26,
              "y": 170,
              "w": 220,
              "h": 130,
              "node": "n0",
              "meta": {
                "Department": "Mechanical"
              },
              "seats": [
                {
                  "id": "b-c-g-B-G7-0",
                  "x": 534,
                  "y": 248,
                  "desk": "C-G7-01",
                  "person": "Dr. Rajeevlochana G. Chittawadigi",
                  "role": "Vice Chairperson Assistant Professor (Sl. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/rg-chittawadigi"
                },
                {
                  "id": "b-c-g-B-G7-1",
                  "x": 568,
                  "y": 248,
                  "desk": "C-G7-02",
                  "person": "Divya Sharma S. G.",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/sg-divya"
                },
                {
                  "id": "b-c-g-B-G7-2",
                  "x": 603,
                  "y": 248,
                  "desk": "C-G7-03",
                  "person": "Dr. Bikram Singh Solanki",
                  "role": "Assistant Professor Level 10",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/bikram-singh-solanki"
                },
                {
                  "id": "b-c-g-B-G7-3",
                  "x": 637,
                  "y": 248,
                  "desk": "C-G7-04",
                  "person": "Dr. Dileep B. P.",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/bp-dileep"
                },
                {
                  "id": "b-c-g-B-G7-4",
                  "x": 672,
                  "y": 248,
                  "desk": "C-G7-05",
                  "person": "Dr. Mohan Kumar S.",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/s-mohankumar"
                },
                {
                  "id": "b-c-g-B-G7-5",
                  "x": 706,
                  "y": 248,
                  "desk": "C-G7-06",
                  "person": "Dr. Mrudula Prashanth",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/p-mrudula"
                },
                {
                  "id": "b-c-g-B-G7-6",
                  "x": 534,
                  "y": 284,
                  "desk": "C-G7-07",
                  "person": "Dr. Phanibhushana M. V.",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/mv-phanibhushana"
                },
                {
                  "id": "b-c-g-B-G7-7",
                  "x": 568,
                  "y": 284,
                  "desk": "C-G7-08",
                  "person": "Dr. Pradeep S. Jakkareddy",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/js-pradeep"
                },
                {
                  "id": "b-c-g-B-G7-8",
                  "x": 603,
                  "y": 284,
                  "desk": "C-G7-09",
                  "person": "Dr. Prakash Marimuthu K.",
                  "role": "Assistant Professor (Sl. Gd.) Deputy Academic Co-Ordinator",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/k-prakash"
                },
                {
                  "id": "b-c-g-B-G7-9",
                  "x": 637,
                  "y": 284,
                  "desk": "C-G7-10",
                  "person": "Dr. Prashanth B N",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/bn-prashanth"
                },
                {
                  "id": "b-c-g-B-G7-10",
                  "x": 672,
                  "y": 284,
                  "desk": "C-G7-11",
                  "person": "Dr. Puja Sengupta",
                  "role": "Assistant Professor Level 10",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/puja-sengupta"
                }
              ]
            },
            {
              "id": "b-c-g-6",
              "type": "classroom",
              "label": "C-G7",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 260,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 80
            },
            {
              "id": "b-c-g-7",
              "type": "support",
              "label": "C-G8",
              "name": "Utility + Drinking Water",
              "shape": "rect",
              "x": 454,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n2"
            },
            {
              "id": "b-c-g-8",
              "type": "support",
              "label": "C-G9",
              "name": "Store",
              "shape": "rect",
              "x": 648,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n3"
            },
            {
              "id": "b-c-g-st",
              "type": "stairs",
              "label": "Stairs",
              "name": "Staircase",
              "shape": "rect",
              "x": 465,
              "y": 340,
              "w": 70,
              "h": 50,
              "node": "n2"
            },
            {
              "id": "b-c-g-wc",
              "type": "restroom",
              "label": "WC",
              "name": "Restrooms",
              "shape": "rect",
              "x": 850,
              "y": 340,
              "w": 66,
              "h": 50,
              "node": "n5"
            },
            {
              "id": "b-c-g-ent",
              "type": "entrance",
              "label": "Entrance",
              "name": "C Block Entrance",
              "shape": "rect",
              "x": 90,
              "y": 340,
              "w": 110,
              "h": 50,
              "node": "n0"
            }
          ]
        },
        {
          "id": "c-1",
          "name": "First Floor",
          "width": 1000,
          "height": 460,
          "outline": "M20,20 L980,20 L980,440 L20,440 Z",
          "corridors": [
            {
              "d": "M40,280 L960,280 L960,320 L40,320 Z"
            }
          ],
          "nodes": [
            {
              "id": "n0",
              "x": 70,
              "y": 300
            },
            {
              "id": "n1",
              "x": 250,
              "y": 300
            },
            {
              "id": "n2",
              "x": 430,
              "y": 300
            },
            {
              "id": "n3",
              "x": 610,
              "y": 300
            },
            {
              "id": "n4",
              "x": 790,
              "y": 300
            },
            {
              "id": "n5",
              "x": 930,
              "y": 300
            }
          ],
          "edges": [
            [
              "n0",
              "n1"
            ],
            [
              "n1",
              "n2"
            ],
            [
              "n2",
              "n3"
            ],
            [
              "n3",
              "n4"
            ],
            [
              "n4",
              "n5"
            ]
          ],
          "spaces": [
            {
              "id": "b-c-1-0",
              "type": "classroom",
              "label": "C-101",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n0",
              "capacity": 80
            },
            {
              "id": "b-c-1-1",
              "type": "classroom",
              "label": "C-102",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 220,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 80
            },
            {
              "id": "b-c-1-2",
              "type": "lab",
              "label": "C-103",
              "name": "Project Lab (40)",
              "shape": "rect",
              "x": 414,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n2",
              "capacity": 40
            },
            {
              "id": "b-c-1-3",
              "type": "classroom",
              "label": "C-104",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 608,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n3",
              "capacity": 80
            },
            {
              "id": "b-c-1-4",
              "type": "classroom",
              "label": "C-105",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 802,
              "y": 26,
              "w": 150,
              "h": 130,
              "node": "n4",
              "capacity": 80
            },
            {
              "id": "b-c-1-5",
              "type": "office",
              "label": "C-106",
              "name": "Mechanical Faculty Room 2",
              "shape": "rect",
              "x": 26,
              "y": 170,
              "w": 220,
              "h": 130,
              "node": "n0",
              "meta": {
                "Department": "Mechanical"
              },
              "seats": [
                {
                  "id": "b-c-1-B-106-0",
                  "x": 293,
                  "y": 248,
                  "desk": "C-106-01",
                  "person": "Dr. Ravi Kumar V.",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/v-ravikumar"
                },
                {
                  "id": "b-c-1-B-106-1",
                  "x": 327,
                  "y": 248,
                  "desk": "C-106-02",
                  "person": "Dr. Shali S.",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/s-shali"
                },
                {
                  "id": "b-c-1-B-106-2",
                  "x": 362,
                  "y": 248,
                  "desk": "C-106-03",
                  "person": "Dr. Shankara",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/k-shankara"
                },
                {
                  "id": "b-c-1-B-106-3",
                  "x": 396,
                  "y": 248,
                  "desk": "C-106-04",
                  "person": "Dr. Shashi Kumar M. E.",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/me-shashikumar"
                },
                {
                  "id": "b-c-1-B-106-4",
                  "x": 431,
                  "y": 248,
                  "desk": "C-106-05",
                  "person": "Dr. Smita Singh",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/smita-singh"
                },
                {
                  "id": "b-c-1-B-106-5",
                  "x": 465,
                  "y": 248,
                  "desk": "C-106-06",
                  "person": "Dr. Ulhas K Annigeri",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/uk-annigeri"
                },
                {
                  "id": "b-c-1-B-106-6",
                  "x": 293,
                  "y": 284,
                  "desk": "C-106-07",
                  "person": "Dr. Y. P. Deepthi",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/p-deepthi"
                },
                {
                  "id": "b-c-1-B-106-7",
                  "x": 327,
                  "y": 284,
                  "desk": "C-106-08",
                  "person": "Prof. Sriram Devanathan",
                  "role": "Principal Professor",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/sriram"
                },
                {
                  "id": "b-c-1-B-106-8",
                  "x": 362,
                  "y": 284,
                  "desk": "C-106-09",
                  "person": "Raghavendra Ravikiran K.",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/kr-ravikiran"
                },
                {
                  "id": "b-c-1-B-106-9",
                  "x": 396,
                  "y": 284,
                  "desk": "C-106-10",
                  "person": "S. Bhanu Prakash",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/b-prakash"
                },
                {
                  "id": "b-c-1-B-106-10",
                  "x": 431,
                  "y": 284,
                  "desk": "C-106-11",
                  "person": "Vinod Kotebavi",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "Mechanical",
                  "url": "https://www.amrita.edu/faculty/k-vinod"
                }
              ]
            },
            {
              "id": "b-c-1-6",
              "type": "classroom",
              "label": "C-107",
              "name": "Classroom (80)",
              "shape": "rect",
              "x": 260,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 80
            },
            {
              "id": "b-c-1-7",
              "type": "support",
              "label": "C-108",
              "name": "Utility + Drinking Water",
              "shape": "rect",
              "x": 454,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n2"
            },
            {
              "id": "b-c-1-st",
              "type": "stairs",
              "label": "Stairs",
              "name": "Staircase",
              "shape": "rect",
              "x": 465,
              "y": 340,
              "w": 70,
              "h": 50,
              "node": "n2"
            },
            {
              "id": "b-c-1-wc",
              "type": "restroom",
              "label": "WC",
              "name": "Restrooms",
              "shape": "rect",
              "x": 850,
              "y": 340,
              "w": 66,
              "h": 50,
              "node": "n5"
            }
          ]
        }
      ]
    },
    "d": {
      "name": "Block D",
      "verified": false,
      "floors": [
        {
          "id": "d-g",
          "name": "Ground Floor",
          "width": 1000,
          "height": 460,
          "outline": "M20,20 L980,20 L980,440 L20,440 Z",
          "corridors": [
            {
              "d": "M40,280 L960,280 L960,320 L40,320 Z"
            }
          ],
          "nodes": [
            {
              "id": "n0",
              "x": 70,
              "y": 300
            },
            {
              "id": "n1",
              "x": 250,
              "y": 300
            },
            {
              "id": "n2",
              "x": 430,
              "y": 300
            },
            {
              "id": "n3",
              "x": 610,
              "y": 300
            },
            {
              "id": "n4",
              "x": 790,
              "y": 300
            },
            {
              "id": "n5",
              "x": 930,
              "y": 300
            }
          ],
          "edges": [
            [
              "n0",
              "n1"
            ],
            [
              "n1",
              "n2"
            ],
            [
              "n2",
              "n3"
            ],
            [
              "n3",
              "n4"
            ],
            [
              "n4",
              "n5"
            ]
          ],
          "spaces": [
            {
              "id": "a-d-g-0",
              "type": "lab",
              "label": "D-G1",
              "name": "Physics Lab (40)",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 220,
              "h": 130,
              "node": "n0",
              "capacity": 40
            },
            {
              "id": "a-d-g-1",
              "type": "lab",
              "label": "D-G2",
              "name": "Chemistry Lab (40)",
              "shape": "rect",
              "x": 260,
              "y": 26,
              "w": 220,
              "h": 130,
              "node": "n1",
              "capacity": 40
            },
            {
              "id": "a-d-g-2",
              "type": "support",
              "label": "D-G3",
              "name": "Lab Store",
              "shape": "rect",
              "x": 494,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n2"
            },
            {
              "id": "a-d-g-3",
              "type": "classroom",
              "label": "D-G4",
              "name": "Tutorial Room (40)",
              "shape": "rect",
              "x": 26,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n0",
              "capacity": 40
            },
            {
              "id": "a-d-g-4",
              "type": "classroom",
              "label": "D-G5",
              "name": "Classroom (60)",
              "shape": "rect",
              "x": 220,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 60
            },
            {
              "id": "a-d-g-5",
              "type": "support",
              "label": "D-G6",
              "name": "Utility + Drinking Water",
              "shape": "rect",
              "x": 414,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n2"
            },
            {
              "id": "a-d-g-st",
              "type": "stairs",
              "label": "Stairs",
              "name": "Staircase",
              "shape": "rect",
              "x": 465,
              "y": 340,
              "w": 70,
              "h": 50,
              "node": "n1"
            },
            {
              "id": "a-d-g-wc",
              "type": "restroom",
              "label": "WC",
              "name": "Restrooms",
              "shape": "rect",
              "x": 850,
              "y": 340,
              "w": 66,
              "h": 50,
              "node": "n2"
            },
            {
              "id": "a-d-g-ent",
              "type": "entrance",
              "label": "Entrance",
              "name": "D Block Entrance (near cafeteria)",
              "shape": "rect",
              "x": 90,
              "y": 340,
              "w": 110,
              "h": 50,
              "node": "n0"
            }
          ]
        },
        {
          "id": "d-1",
          "name": "First Floor",
          "width": 1000,
          "height": 460,
          "outline": "M20,20 L980,20 L980,440 L20,440 Z",
          "corridors": [
            {
              "d": "M40,280 L960,280 L960,320 L40,320 Z"
            }
          ],
          "nodes": [
            {
              "id": "n0",
              "x": 70,
              "y": 300
            },
            {
              "id": "n1",
              "x": 250,
              "y": 300
            },
            {
              "id": "n2",
              "x": 430,
              "y": 300
            },
            {
              "id": "n3",
              "x": 610,
              "y": 300
            },
            {
              "id": "n4",
              "x": 790,
              "y": 300
            },
            {
              "id": "n5",
              "x": 930,
              "y": 300
            }
          ],
          "edges": [
            [
              "n0",
              "n1"
            ],
            [
              "n1",
              "n2"
            ],
            [
              "n2",
              "n3"
            ],
            [
              "n3",
              "n4"
            ],
            [
              "n4",
              "n5"
            ]
          ],
          "spaces": [
            {
              "id": "a-d-1-0",
              "type": "classroom",
              "label": "D-101",
              "name": "Classroom (60)",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n0",
              "capacity": 60
            },
            {
              "id": "a-d-1-1",
              "type": "classroom",
              "label": "D-102",
              "name": "Classroom (60)",
              "shape": "rect",
              "x": 220,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 60
            },
            {
              "id": "a-d-1-2",
              "type": "office",
              "label": "D-103",
              "name": "Sciences Faculty Room (Chem/Phys)",
              "shape": "rect",
              "x": 414,
              "y": 26,
              "w": 260,
              "h": 130,
              "node": "n1",
              "meta": {
                "Department": "Chemistry/Physics"
              },
              "seats": [
                {
                  "id": "a-d-1-A-103-0",
                  "x": 704,
                  "y": 97,
                  "desk": "D-103-01",
                  "person": "Dr. S. Giridhar Reddy",
                  "role": "Chairperson",
                  "dept": "Chemistry",
                  "url": "https://www.amrita.edu/faculty/s-giri"
                },
                {
                  "id": "a-d-1-A-103-1",
                  "x": 782,
                  "y": 97,
                  "desk": "D-103-02",
                  "person": "Dr. Amrita Thakur",
                  "role": "Assistant Professor (Sl.Gd.)",
                  "dept": "Chemistry",
                  "url": "https://www.amrita.edu/faculty/t-amrita"
                },
                {
                  "id": "a-d-1-A-103-2",
                  "x": 859,
                  "y": 97,
                  "desk": "D-103-03",
                  "person": "Dr. Anil Kumar S.",
                  "role": "Assistant Professor (Sl. Gd.)",
                  "dept": "Chemistry",
                  "url": "https://www.amrita.edu/faculty/s-anilkumar"
                },
                {
                  "id": "a-d-1-A-103-3",
                  "x": 937,
                  "y": 97,
                  "desk": "D-103-04",
                  "person": "Dr. B. L. Bhaskar",
                  "role": "Assistant Professor (Sl.Gd.)",
                  "dept": "Chemistry",
                  "url": "https://www.amrita.edu/faculty/bl-bhaskar"
                },
                {
                  "id": "a-d-1-A-103-4",
                  "x": 704,
                  "y": 133,
                  "desk": "D-103-05",
                  "person": "Dr. B. Siva Kumar",
                  "role": "Associate Professor",
                  "dept": "Chemistry",
                  "url": "https://www.amrita.edu/faculty/b-sivakumar"
                },
                {
                  "id": "a-d-1-A-103-5",
                  "x": 782,
                  "y": 133,
                  "desk": "D-103-06",
                  "person": "Dr. T. M. Mohan Kumar",
                  "role": "Assistant Professor",
                  "dept": "Chemistry",
                  "url": "https://www.amrita.edu/faculty/tm-mohankumar"
                },
                {
                  "id": "a-d-1-A-103-6",
                  "x": 859,
                  "y": 133,
                  "desk": "D-103-07",
                  "person": "H. Manjunatha",
                  "role": "Assistant Professor (Sr. Gd.)",
                  "dept": "Physics",
                  "url": "https://www.amrita.edu/faculty/h-manjunath"
                }
              ]
            },
            {
              "id": "a-d-1-3",
              "type": "classroom",
              "label": "D-104",
              "name": "Classroom (60)",
              "shape": "rect",
              "x": 26,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n0",
              "capacity": 60
            },
            {
              "id": "a-d-1-4",
              "type": "lab",
              "label": "D-105",
              "name": "Research Lab (30)",
              "shape": "rect",
              "x": 220,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n1",
              "capacity": 30
            },
            {
              "id": "a-d-1-5",
              "type": "support",
              "label": "D-106",
              "name": "Utility + Drinking Water",
              "shape": "rect",
              "x": 414,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n2"
            },
            {
              "id": "a-d-1-st",
              "type": "stairs",
              "label": "Stairs",
              "name": "Staircase",
              "shape": "rect",
              "x": 465,
              "y": 340,
              "w": 70,
              "h": 50,
              "node": "n1"
            },
            {
              "id": "a-d-1-wc",
              "type": "restroom",
              "label": "WC",
              "name": "Restrooms",
              "shape": "rect",
              "x": 850,
              "y": 340,
              "w": 66,
              "h": 50,
              "node": "n2"
            }
          ]
        }
      ]
    },
    "e": {
      "name": "Block E",
      "verified": false,
      "floors": [
        {
          "id": "e-g",
          "name": "Ground Floor",
          "width": 1000,
          "height": 460,
          "outline": "M20,20 L980,20 L980,440 L20,440 Z",
          "corridors": [
            {
              "d": "M40,280 L960,280 L960,320 L40,320 Z"
            }
          ],
          "nodes": [
            {
              "id": "n0",
              "x": 70,
              "y": 300
            },
            {
              "id": "n1",
              "x": 357,
              "y": 300
            },
            {
              "id": "n2",
              "x": 643,
              "y": 300
            },
            {
              "id": "n3",
              "x": 930,
              "y": 300
            }
          ],
          "edges": [
            [
              "n0",
              "n1"
            ],
            [
              "n1",
              "n2"
            ],
            [
              "n2",
              "n3"
            ]
          ],
          "spaces": [
            {
              "id": "e-e-g-0",
              "type": "entrance",
              "label": "Lobby",
              "name": "Main Entrance & Reception",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 200,
              "h": 130,
              "node": "n0"
            },
            {
              "id": "e-e-g-1",
              "type": "admin",
              "label": "E-G2",
              "name": "Administrative Office",
              "shape": "rect",
              "x": 240,
              "y": 26,
              "w": 200,
              "h": 130,
              "node": "n1"
            },
            {
              "id": "e-e-g-2",
              "type": "admin",
              "label": "E-G3",
              "name": "Director's Office",
              "shape": "rect",
              "x": 454,
              "y": 26,
              "w": 180,
              "h": 130,
              "node": "n2"
            },
            {
              "id": "e-e-g-3",
              "type": "admin",
              "label": "E-G5",
              "name": "Admissions Office",
              "shape": "rect",
              "x": 648,
              "y": 26,
              "w": 150,
              "h": 130,
              "node": "n3"
            },
            {
              "id": "e-e-g-4",
              "type": "amenity",
              "label": "E-G7",
              "name": "Medical Room",
              "shape": "rect",
              "x": 26,
              "y": 170,
              "w": 200,
              "h": 130,
              "node": "n0"
            },
            {
              "id": "e-e-g-5",
              "type": "support",
              "label": "E-G8",
              "name": "Bank / ATM",
              "shape": "rect",
              "x": 240,
              "y": 170,
              "w": 200,
              "h": 130,
              "node": "n1"
            },
            {
              "id": "e-e-g-6",
              "type": "support",
              "label": "E-G9",
              "name": "Security & Reception",
              "shape": "rect",
              "x": 454,
              "y": 170,
              "w": 180,
              "h": 130,
              "node": "n2"
            },
            {
              "id": "e-e-g-7",
              "type": "support",
              "label": "E-G10",
              "name": "Utility & Storage",
              "shape": "rect",
              "x": 648,
              "y": 170,
              "w": 150,
              "h": 130,
              "node": "n3"
            },
            {
              "id": "e-e-g-st",
              "type": "stairs",
              "label": "Stairs",
              "name": "Central Staircase",
              "shape": "rect",
              "x": 465,
              "y": 340,
              "w": 70,
              "h": 50,
              "node": "n2"
            },
            {
              "id": "e-e-g-wc",
              "type": "restroom",
              "label": "WC",
              "name": "Restrooms",
              "shape": "rect",
              "x": 850,
              "y": 340,
              "w": 66,
              "h": 50,
              "node": "n4"
            },
            {
              "id": "e-e-g-ent",
              "type": "entrance",
              "label": "Entrance",
              "name": "Block E Entrance",
              "shape": "rect",
              "x": 90,
              "y": 340,
              "w": 110,
              "h": 50,
              "node": "n0"
            }
          ]
        },
        {
          "id": "e-1",
          "name": "First Floor",
          "width": 1000,
          "height": 460,
          "outline": "M20,20 L980,20 L980,440 L20,440 Z",
          "corridors": [
            {
              "d": "M40,280 L960,280 L960,320 L40,320 Z"
            }
          ],
          "nodes": [
            {
              "id": "n0",
              "x": 70,
              "y": 300
            },
            {
              "id": "n1",
              "x": 357,
              "y": 300
            },
            {
              "id": "n2",
              "x": 643,
              "y": 300
            },
            {
              "id": "n3",
              "x": 930,
              "y": 300
            }
          ],
          "edges": [
            [
              "n0",
              "n1"
            ],
            [
              "n1",
              "n2"
            ],
            [
              "n2",
              "n3"
            ]
          ],
          "spaces": [
            {
              "id": "e-e-1-0",
              "type": "hall",
              "label": "Amriteshwari",
              "name": "Amriteshwari Hall",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 280,
              "h": 140,
              "node": "n0",
              "capacity": 265
            },
            {
              "id": "e-e-1-1",
              "type": "hall",
              "label": "Sudhamani",
              "name": "Sudhamani Hall",
              "shape": "rect",
              "x": 320,
              "y": 26,
              "w": 280,
              "h": 140,
              "node": "n1",
              "capacity": 300
            },
            {
              "id": "e-e-1-2",
              "type": "hall",
              "label": "Krishna",
              "name": "Krishna Hall",
              "shape": "rect",
              "x": 614,
              "y": 26,
              "w": 200,
              "h": 140,
              "node": "n2",
              "capacity": 112
            },
            {
              "id": "e-e-1-3",
              "type": "classroom",
              "label": "E-104",
              "name": "Classroom",
              "shape": "rect",
              "x": 26,
              "y": 180,
              "w": 180,
              "h": 110,
              "node": "n0",
              "capacity": 80
            },
            {
              "id": "e-e-1-4",
              "type": "office",
              "label": "E-105",
              "name": "Faculty Room",
              "shape": "rect",
              "x": 220,
              "y": 180,
              "w": 180,
              "h": 110,
              "node": "n1",
              "meta": {
                "Department": "Mathematics"
              }
            },
            {
              "id": "e-e-1-5",
              "type": "classroom",
              "label": "E-106",
              "name": "Classroom",
              "shape": "rect",
              "x": 414,
              "y": 180,
              "w": 180,
              "h": 110,
              "node": "n2",
              "capacity": 80
            },
            {
              "id": "e-e-1-6",
              "type": "support",
              "label": "E-108",
              "name": "Drinking Water",
              "shape": "rect",
              "x": 608,
              "y": 180,
              "w": 180,
              "h": 110,
              "node": "n3"
            },
            {
              "id": "e-e-1-st",
              "type": "stairs",
              "label": "Stairs",
              "name": "Staircase",
              "shape": "rect",
              "x": 465,
              "y": 340,
              "w": 70,
              "h": 50,
              "node": "n2"
            },
            {
              "id": "e-e-1-wc",
              "type": "restroom",
              "label": "WC",
              "name": "Restrooms",
              "shape": "rect",
              "x": 850,
              "y": 340,
              "w": 66,
              "h": 50,
              "node": "n4"
            }
          ]
        },
        {
          "id": "e-2",
          "name": "Second Floor",
          "width": 1000,
          "height": 460,
          "outline": "M20,20 L980,20 L980,440 L20,440 Z",
          "corridors": [
            {
              "d": "M40,280 L960,280 L960,320 L40,320 Z"
            }
          ],
          "nodes": [
            {
              "id": "n0",
              "x": 70,
              "y": 300
            },
            {
              "id": "n1",
              "x": 357,
              "y": 300
            },
            {
              "id": "n2",
              "x": 643,
              "y": 300
            },
            {
              "id": "n3",
              "x": 930,
              "y": 300
            }
          ],
          "edges": [
            [
              "n0",
              "n1"
            ],
            [
              "n1",
              "n2"
            ],
            [
              "n2",
              "n3"
            ]
          ],
          "spaces": [
            {
              "id": "e-e-2-0",
              "type": "hall",
              "label": "Vyasa",
              "name": "Vyasa Hall",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 200,
              "h": 140,
              "node": "n0",
              "capacity": 90
            },
            {
              "id": "e-e-2-1",
              "type": "hall",
              "label": "Rama",
              "name": "Rama Hall",
              "shape": "rect",
              "x": 240,
              "y": 26,
              "w": 200,
              "h": 140,
              "node": "n1",
              "capacity": 85
            },
            {
              "id": "e-e-2-2",
              "type": "hall",
              "label": "Valmiki",
              "name": "Valmiki Hall",
              "shape": "rect",
              "x": 454,
              "y": 26,
              "w": 200,
              "h": 140,
              "node": "n2",
              "capacity": 80
            },
            {
              "id": "e-e-2-3",
              "type": "hall",
              "label": "Conference",
              "name": "Conference Hall",
              "shape": "rect",
              "x": 668,
              "y": 26,
              "w": 180,
              "h": 140,
              "node": "n3",
              "capacity": 27
            },
            {
              "id": "e-e-2-4",
              "type": "classroom",
              "label": "E-205",
              "name": "Classroom",
              "shape": "rect",
              "x": 26,
              "y": 180,
              "w": 180,
              "h": 110,
              "node": "n0",
              "capacity": 80
            },
            {
              "id": "e-e-2-5",
              "type": "office",
              "label": "E-206",
              "name": "Faculty Room",
              "shape": "rect",
              "x": 220,
              "y": 180,
              "w": 180,
              "h": 110,
              "node": "n1",
              "meta": {
                "Department": "SoE"
              }
            },
            {
              "id": "e-e-2-6",
              "type": "lab",
              "label": "E-207",
              "name": "Research Lab",
              "shape": "rect",
              "x": 414,
              "y": 180,
              "w": 180,
              "h": 110,
              "node": "n2"
            },
            {
              "id": "e-e-2-7",
              "type": "lab",
              "label": "E-208",
              "name": "Innovation Lab",
              "shape": "rect",
              "x": 608,
              "y": 180,
              "w": 180,
              "h": 110,
              "node": "n3"
            },
            {
              "id": "e-e-2-st",
              "type": "stairs",
              "label": "Stairs",
              "name": "Staircase",
              "shape": "rect",
              "x": 465,
              "y": 340,
              "w": 70,
              "h": 50,
              "node": "n2"
            },
            {
              "id": "e-e-2-wc",
              "type": "restroom",
              "label": "WC",
              "name": "Restrooms",
              "shape": "rect",
              "x": 850,
              "y": 340,
              "w": 66,
              "h": 50,
              "node": "n4"
            }
          ]
        },
        {
          "id": "e-3",
          "name": "Third Floor",
          "width": 1000,
          "height": 460,
          "outline": "M20,20 L980,20 L980,440 L20,440 Z",
          "corridors": [
            {
              "d": "M40,280 L960,280 L960,320 L40,320 Z"
            }
          ],
          "nodes": [
            {
              "id": "n0",
              "x": 70,
              "y": 300
            },
            {
              "id": "n1",
              "x": 357,
              "y": 300
            },
            {
              "id": "n2",
              "x": 643,
              "y": 300
            },
            {
              "id": "n3",
              "x": 930,
              "y": 300
            }
          ],
          "edges": [
            [
              "n0",
              "n1"
            ],
            [
              "n1",
              "n2"
            ],
            [
              "n2",
              "n3"
            ]
          ],
          "spaces": [
            {
              "id": "e-e-3-0",
              "type": "hall",
              "label": "Indo-US",
              "name": "Indo-US Corporate Classroom",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 230,
              "h": 140,
              "node": "n0",
              "capacity": 62
            },
            {
              "id": "e-e-3-1",
              "type": "hall",
              "label": "E-Learning",
              "name": "E-Learning Studio",
              "shape": "rect",
              "x": 270,
              "y": 26,
              "w": 230,
              "h": 140,
              "node": "n1",
              "capacity": 120
            },
            {
              "id": "e-e-3-2",
              "type": "hall",
              "label": "Akshaya",
              "name": "Akshaya Hall",
              "shape": "rect",
              "x": 514,
              "y": 26,
              "w": 200,
              "h": 140,
              "node": "n2",
              "capacity": 100
            },
            {
              "id": "e-e-3-3",
              "type": "classroom",
              "label": "E-304",
              "name": "Classroom",
              "shape": "rect",
              "x": 26,
              "y": 180,
              "w": 180,
              "h": 110,
              "node": "n0",
              "capacity": 80
            },
            {
              "id": "e-e-3-4",
              "type": "office",
              "label": "E-303",
              "name": "Faculty Room",
              "shape": "rect",
              "x": 220,
              "y": 180,
              "w": 180,
              "h": 110,
              "node": "n1",
              "meta": {
                "Department": "AIE"
              }
            },
            {
              "id": "e-e-3-5",
              "type": "lab",
              "label": "E-307",
              "name": "Project Lab",
              "shape": "rect",
              "x": 414,
              "y": 180,
              "w": 180,
              "h": 110,
              "node": "n2"
            },
            {
              "id": "e-e-3-6",
              "type": "support",
              "label": "E-308",
              "name": "Reading Hall",
              "shape": "rect",
              "x": 608,
              "y": 180,
              "w": 180,
              "h": 110,
              "node": "n3"
            },
            {
              "id": "e-e-3-st",
              "type": "stairs",
              "label": "Stairs",
              "name": "Staircase",
              "shape": "rect",
              "x": 465,
              "y": 340,
              "w": 70,
              "h": 50,
              "node": "n2"
            },
            {
              "id": "e-e-3-wc",
              "type": "restroom",
              "label": "WC",
              "name": "Restrooms",
              "shape": "rect",
              "x": 850,
              "y": 340,
              "w": 66,
              "h": 50,
              "node": "n4"
            }
          ]
        },
        {
          "id": "e-4",
          "name": "Fourth Floor",
          "width": 1000,
          "height": 460,
          "outline": "M20,20 L980,20 L980,440 L20,440 Z",
          "corridors": [
            {
              "d": "M40,280 L960,280 L960,320 L40,320 Z"
            }
          ],
          "nodes": [
            {
              "id": "n0",
              "x": 70,
              "y": 300
            },
            {
              "id": "n1",
              "x": 357,
              "y": 300
            },
            {
              "id": "n2",
              "x": 643,
              "y": 300
            },
            {
              "id": "n3",
              "x": 930,
              "y": 300
            }
          ],
          "edges": [
            [
              "n0",
              "n1"
            ],
            [
              "n1",
              "n2"
            ],
            [
              "n2",
              "n3"
            ]
          ],
          "spaces": [
            {
              "id": "e-e-4-0",
              "type": "amenity",
              "label": "Library",
              "name": "Central Library \u2014 Stacks",
              "shape": "rect",
              "x": 26,
              "y": 26,
              "w": 226,
              "h": 137,
              "node": "n0",
              "meta": {
                "Location": "New Block 4th floor",
                "Area": "1213 sq m"
              }
            },
            {
              "id": "e-e-4-1",
              "type": "amenity",
              "label": "Reference",
              "name": "Reference & Periodicals",
              "shape": "rect",
              "x": 266,
              "y": 26,
              "w": 250,
              "h": 160,
              "node": "n1",
              "capacity": 150,
              "meta": {
                "Area": "325 sq m"
              }
            },
            {
              "id": "e-e-4-2",
              "type": "amenity",
              "label": "Digital",
              "name": "Digital Library VIDYA",
              "shape": "rect",
              "x": 507,
              "y": 26,
              "w": 226,
              "h": 137,
              "node": "n2"
            },
            {
              "id": "e-e-4-3",
              "type": "amenity",
              "label": "Reading",
              "name": "Reading Hall",
              "shape": "rect",
              "x": 748,
              "y": 26,
              "w": 250,
              "h": 160,
              "node": "n3",
              "capacity": 150,
              "meta": {
                "Hours": "8 AM \u2013 12 AM"
              }
            },
            {
              "id": "e-e-4-4",
              "type": "admin",
              "label": "E-405",
              "name": "Librarian's Office",
              "shape": "rect",
              "x": 26,
              "y": 177,
              "w": 226,
              "h": 137,
              "node": "n0"
            },
            {
              "id": "e-e-4-5",
              "type": "amenity",
              "label": "E-406",
              "name": "Faculty Lounge",
              "shape": "rect",
              "x": 266,
              "y": 177,
              "w": 226,
              "h": 137,
              "node": "n1"
            },
            {
              "id": "e-e-4-6",
              "type": "support",
              "label": "E-407",
              "name": "Reprographics",
              "shape": "rect",
              "x": 507,
              "y": 177,
              "w": 226,
              "h": 137,
              "node": "n2"
            },
            {
              "id": "e-e-4-7",
              "type": "amenity",
              "label": "E-408",
              "name": "E-Resources",
              "shape": "rect",
              "x": 748,
              "y": 177,
              "w": 226,
              "h": 137,
              "node": "n3"
            },
            {
              "id": "e-e-4-st",
              "type": "stairs",
              "label": "Stairs",
              "name": "Staircase",
              "shape": "rect",
              "x": 465,
              "y": 365,
              "w": 70,
              "h": 50,
              "node": "n2"
            },
            {
              "id": "e-e-4-wc",
              "type": "restroom",
              "label": "WC",
              "name": "Restrooms",
              "shape": "rect",
              "x": 850,
              "y": 365,
              "w": 66,
              "h": 50,
              "node": "n3"
            }
          ]
        }
      ]
    }
  }
} as const;
