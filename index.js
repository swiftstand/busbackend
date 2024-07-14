import express from "express";
import cityData from "./city.js";
import travelData from "./travelData.js";

// SIRI
// import userDetails from "./Siri/userDetails.js";
// import Cities from "./Siri/Cities.js";
// import BusSchedule from "./Siri/BusSchedule.js";
import DatabaseManager from './db_scripts/createTables.js'

// JSON LOADERS
import AllBuses from './db_scripts/LoadDB/AllBuses.js'
import BusSchedules from './db_scripts/LoadDB/BusSchedules.js'
import AllCities from './db_scripts/LoadDB/AllCities.js'


const server = express();
server.use(express.json());

// Define the port number
const PORT = process.env.PORT || 5000;

server.get("/", (req, res) => {
  res.send("Bus Booking Server");
});

server.get("/city", (req, res) => {
  res.status(200).json(cityData);
});

server.get("/travelData", (req, res) => {
  res.status(200).json(travelData);
});


// Initialize DatabaseManager
const dbManager = new DatabaseManager('database.sqlite');

// Create tables
dbManager.createUserTable();
dbManager.createBusTable();
dbManager.createBusScheduleTable();
dbManager.createBookingTable();
dbManager.createSeatsTable();
dbManager.createCityTable();


server.get("/loaddb/", async (req, res) => {
  console.log("LOADING")
  try{
    await dbManager.loadBuses(AllBuses)
    await dbManager.loadCities(AllCities)
    await dbManager.loadBusScedule(BusSchedules)
  } catch (err) {
    console.log("ERR = ", err)
    return res.status(404).send(err);
  }

  console.log("success == ")
  return res.status(201)

});


server.get("/travelData/:id/", (req, res) => {
  const { id } = req.params;
  const travel = travelData.find((travel) => travel.id === parseInt(id));
  if (travel) {
    res.status(200).json(travel);
  } else {
    res.status(404).send("Aradığınız bilgiler bulunamadı.");
  }
});

server.post("/buy", (req, res) => {
  const { otobusId, koltukNo, row, gender } = req.body;
  const newData = travelData;
  const dataIndex = travelData.findIndex(
    (travel) => travel.id === parseInt(otobusId)
  );
  const seatDataIndex = travelData[dataIndex].seats[row].findIndex(
    (seat) => seat.id === koltukNo
  );
  travelData[dataIndex].seats[row][seatDataIndex].empty = false;
  travelData[dataIndex].seats[row][seatDataIndex].selected = true;
  travelData[dataIndex].seats[row][seatDataIndex].gender = gender;
});


// SIRI ENDPOINTS


// Endpoint to retrieve all bus schedules
server.get('/busschedules/', async (req, res) => {
  console.log("GETTING SCHEDULE")
  try {
    const schedules = await new Promise((resolve, reject) => {
      dbManager.db.all('SELECT * FROM BusSchedule', [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

    const result = await Promise.all(schedules.map(async (schedule) => {
      const bookings = await new Promise((resolve, reject) => {
        dbManager.db.all('SELECT * FROM Booking WHERE BusScheduleID = ?', [schedule.id], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });

      const booked = await Promise.all(bookings.map(async (booking) => {
        const seats = await new Promise((resolve, reject) => {
          dbManager.db.all('SELECT * FROM Seats WHERE BookingID = ?', [booking.id], (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
          });
        });

        return {
          PhoneNumber: booking.PhoneNumber,
          seats: seats.map((seat) => ({
            Gender: seat.Gender,
            seatID: seat.seatID,
            pending: Boolean(seat.pending)
          })),
        };
      }));

      return {
        ...schedule,
        Booked: booked,
      };
    }));

    console.log("FINISHED = ", result)
    return res.status(200).json(result);
  } catch (err) {
    console.log("ERR= ", err )
    return res.status(500).json({ error: err.message });
  }
});



server.get('/cities/', async (req, res) => {

  await new Promise((resolve, reject) => {
  dbManager.db.all(
    'SELECT * FROM Cities',
    (err, cities) => {
      console.log("Cities - ", cities, err)
      if (err) {
        return res.status(500).json({ error: err.message });
      } else {
        return res.status(201).json(cities);
      }
    }
  )
  })
})


server.post('/busschedules/:busScheduleID/book', async (req, res) => {
  const { busScheduleID } = req.params;
  const { PhoneNumber, seats, pending } = req.body;

  console.log("BODY= ", req.body)

  try {
    const existingBooking = await new Promise((resolve, reject) => {
      dbManager.db.get(
        'SELECT * FROM Booking WHERE BusScheduleID = ? AND PhoneNumber = ?',
        [busScheduleID, PhoneNumber],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    let bookingID;

    if (existingBooking) {
      // Update existing booking
      bookingID = existingBooking.id;
    } else {
      // Insert new booking
      bookingID = await new Promise((resolve, reject) => {
        dbManager.db.run(
          'INSERT INTO Booking (BusScheduleID, PhoneNumber) VALUES (?, ?)',
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
    }

    // Insert new seats for the booking
    for (const seat of seats) {
      const { Gender, seatID } = seat;

      await new Promise((resolve, reject) => {
        dbManager.db.run(
          'INSERT INTO Seats (BookingID, Gender, seatID, pending) VALUES (?, ?, ?, ?)',
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

    res.status(201).json({ message: 'Booking updated successfully' });
  } catch (err) {
    console.log("E = ", err)
    res.status(500).json({ error: err.message });
  }
});



server.post('/login/', async (req, res) => {
  const { phoneNumber, password } = req.body;
  console.log("BDY - ", req.body)

  await new Promise((resolve, reject) => {
  dbManager.db.all(
    'SELECT * FROM Users WHERE phoneNumber = ? AND password = ?  ',[phoneNumber, password],
    (err, user) => {
      
      if (err || user==[]) {
        console.log("INN - ", user, err)
        return res.status(500).json({ error: 'could not find user' });
      } else {
        console.log("WET - ", user, err)
        if (user.length > 0){
          return res.status(201).json(user[0]);
        } else {
          return res.status(500).json({ error: 'could not find user' });
        }
      }
    }
  )
  })
})

server.post('/register/', async (req, res) => {
  const { phoneNumber, password, fullName } = req.body;

  await new Promise((resolve, reject) => {
    dbManager.db.run(
      `INSERT INTO Users (name, phoneNumber, password) VALUES (?, ?, ?)`,
      [fullName, phoneNumber, password],
      function (err, user) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        const userId= this.lastID
        dbManager.db.all(
          'SELECT * FROM Users WHERE id = ?',
          [userId], (err, user) => {
            if (err || user==[]) {
              return res.status(500).json({ error: 'could not find user' });
            } else {
              console.log("WET - ", user, err)
              if (user.length > 0){
                return res.status(201).json(user[0]);
              } else {
                return res.status(500).json({ error: 'could not find user' });
              }
            }
          }
        )
        
      }
    );
  })

  
  return res.status(201).json(newUser);
})

server.listen(PORT, '0.0.0.0',  () => {

  console.log("MY Server Running on..", PORT, "-", process.env.HOST);
});
