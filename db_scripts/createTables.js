
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';


const sqlite3Verbose = sqlite3.verbose();

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export default class DatabaseManager {
  constructor(databaseFile) {
    this.dbPath = path.resolve(__dirname, databaseFile);
    this.db = new sqlite3Verbose.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Error opening database', err);
      } else {
        console.log('Database connected');
      }
    });
  }



  createUserTable() {
    const sql = `CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phoneNumber TEXT UNIQUE,
      password TEXT
    )`;
    this.db.run(sql, (err) => {
      if (err) {
        console.error('Error creating Users table', err);
      } else {
        console.log('Users table created');
      }
    });
  }

  createBusTable() {
    const sql = `CREATE TABLE IF NOT EXISTS Buses (
      BusID INTEGER PRIMARY KEY AUTOINCREMENT,
      BusStandard TEXT,
      Price TEXT,
      seatId INTEGER
    )`;
    this.db.run(sql, (err) => {
      if (err) {
        console.error('Error creating Buses table', err);
      } else {
        console.log('Buses table created');
      }
    });
  }

  createBusScheduleTable() {
    const sql = `CREATE TABLE IF NOT EXISTS BusSchedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      BusID INTEGER,
      Arrival TEXT,
      ArrivalTime TEXT,
      BusStandard TEXT,
      Date TEXT,
      Day TEXT,
      DepartureTime TEXT,
      Destination TEXT,
      Price INTEGER,
      TotalSeats INTEGER,
      FOREIGN KEY (BusID) REFERENCES Buses(BusID)
    )`;
    this.db.run(sql, (err) => {
      if (err) {
        console.error('Error creating BusSchedule table', err);
      } else {
        console.log('BusSchedule table created');
      }
    });
  }

  createBookingTable() {
    const sql = `CREATE TABLE IF NOT EXISTS Booking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      BusScheduleID INTEGER,
      PhoneNumber TEXT,
      FOREIGN KEY (BusScheduleID) REFERENCES BusSchedule(id)
    )`;
    this.db.run(sql, (err) => {
      if (err) {
        console.error('Error creating Booking table', err);
      } else {
        console.log('Booking table created');
      }
    });
  }

  createCityTable() {
    const sql = `CREATE TABLE IF NOT EXISTS Cities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    )`;
    this.db.run(sql, (err) => {
      if (err) {
        console.error('Error creating Cities table', err);
      } else {
        console.log('Cities table created');
      }
    });
  }

  createSeatsTable() {
    const sql = `CREATE TABLE IF NOT EXISTS Seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      BookingID INTEGER,
      Gender INTEGER,
      seatID INTEGER,
      pending INTEGER NOT NULL CHECK (pending IN (0, 1)),
      FOREIGN KEY (BookingID) REFERENCES Booking(id)
    )`;
    this.db.run(sql, (err) => {
      if (err) {
        console.error('Error creating Seats table', err);
      } else {
        console.log('Seats table created');
      }
    });
}

  close() {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }

  async loadCities(cities) {
    try {
      for (const city of cities) {
  
        await new Promise((resolve, reject) => {
          this.db.run(
            `INSERT INTO Cities (name) 
            VALUES (?)`,
            [city],
            function (err) {
              if (err) {
                reject(err);
              } else {
                resolve(this.lastID);
              }
            }
          );
        })}
        return 1
      }catch (err) {
        res.status(500).json({ error: err.message });
      }
    }


  async loadBuses(buses) {
    // try {
      for (const bus of buses) {
        const {
          BusStandard, Price, seatID
        } = bus;
  
        await new Promise((resolve, reject) => {
          this.db.run(
            `INSERT INTO Buses (BusStandard, Price, seatID) 
            VALUES (?, ?, ?)`,
            [BusStandard, Price, seatID],
            function (err) {
              if (err) {
                reject(err);
              } else {
                resolve(this.lastID);
              }
            }
          );
        })}
        return 1
      // }catch (err) {
      //   console.log()
      // }
    }

  async loadBusScedule(schedules) {
    // try {
      for (const schedule of schedules) {
        const {
          BusID, Arrival, ArrivalTime, BusStandard, Date, Day, DepartureTime, Destination, Price, TotalSeats, Booked
        } = schedule;
  
        const busScheduleID = await new Promise((resolve, reject) => {
          this.db.run(
            `INSERT INTO BusSchedule (BusID, Arrival, ArrivalTime, BusStandard, Date, Day, DepartureTime, Destination, Price, TotalSeats) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [BusID, Arrival, ArrivalTime, BusStandard, Date, Day, DepartureTime, Destination, Price, TotalSeats],
            function (err) {
              if (err) {
                reject(err);
              } else {
                resolve(this.lastID);
              }
            }
          );
        });
        
        if (Booked) {
          for (const booking of Booked) {
            const { PhoneNumber, seats } = booking;
    
            const bookingID = await new Promise((resolve, reject) => {
              this.db.run(
                `INSERT INTO Booking (BusScheduleID, PhoneNumber) VALUES (?, ?)`,
                [busScheduleID, PhoneNumber],
                function (err) {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(this.lastID);
                  }
                }
              );
            });
    
            for (const seat of seats) {
              const { Gender, seatID, pending } = seat;
    
              await new Promise((resolve, reject) => {
                this.db.run(
                  `INSERT INTO Seats (BookingID, Gender, seatID, pending) VALUES (?, ?, ?, ?)`,
                  [bookingID, Gender, seatID, pending],
                  function (err) {
                    if (err) {
                      reject(err);
                    } else {
                      resolve();
                    }
                  }
                );
              });
            }
          }
        }
      }

    // } catch (err) {
    //   res.status(500).json({ error: err.message });
    // }
  }
}

