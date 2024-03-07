const express = require("express");

const mongoose = require("mongoose");

const app = express();

app.use(express.json());
const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://rawatsaheb_5:jERSVgLHH59dY6vk@cluster0.1w66ns5.mongodb.net/parkinglot"
    );
    console.log("connected successfully");
  } catch (error) {
    console.log(error);
  }
};
connectDB();


const parkingLotSchema = new mongoose.Schema({
    capacity: { type: Number, required: true, min: 0, max: 2000 },
    isActive: { type: Boolean, default: true },
    slots: [{ slot_number: Number, registration_number: String, color: String }]
});

const ParkingLot = mongoose.model('ParkingLot', parkingLotSchema);


app.get('/', (req, res) => {
    res.send('ok')
})

app.post('/api/ParkingLots', async (req, res) => {
    try {
        const { capacity, isActive } = req.body;
       
        if (capacity < 0 || capacity > 2000) {
            res.status(400).send('Capacity should be between 0 and 2000');
            return;
        }
        
        const parkingLot = await ParkingLot.create({ capacity, isActive });
        const response = {
            id: parkingLot._id,
            capacity: parkingLot.capacity,
            isActive: parkingLot.isActive
        };
        res.status(201).json({ isSuccess: true, response });
    } catch (err) {
        res.status(500).send('Error creating parking lot');
    }
});


app.post("/api/Parkings", async (req, res) => {
    try {
      const { parkingLotId, registrationNumber, color } = req.body;
  
    
      const parkingLot = await ParkingLot.findById(parkingLotId);
  
      
      if (!parkingLot) {
        return res.status(404).json({ isSuccess: false, message: "Parking lot not found" });
      }
  
      
      if (!parkingLot.isActive) {
        return res.status(400).json({ isSuccess: false, message: "Parking lot is not active" });
      }
  
      
      if (parkingLot.slots.length >= parkingLot.capacity) {
        return res.status(400).json({ isSuccess: false, message: "Parking lot is full" });
      }
  
      
      const slotNumber = parkingLot.slots.length + 1; 
      parkingLot.slots.push({ slot_number: slotNumber, registration_number: registrationNumber, color: color });
      await parkingLot.save();
  
      res.status(200).json({ isSuccess: true, response: { slotNumber: slotNumber, status: "PARKED" } });
    } catch (error) {
      res.status(500).json({ isSuccess: false, message: "Error parking car", error: error.message });
    }
  });


app.delete('/api/Parkings', async (req, res) => {
    try {
        const { parkingLotId, registrationNumber } = req.body;

       
        const registrationNumberPattern = /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/;
        if (!registrationNumberPattern.test(registrationNumber)) {
            res.status(400).json({ isSuccess: false, message: 'Invalid registration number' });
            return;
        }

       
        const parkingLot = await ParkingLot.findById(parkingLotId);
        if (!parkingLot) {
            res.status(404).json({ isSuccess: false, message: 'Parking lot not found' });
            return;
        }

        
        if (!parkingLot.isActive) {
            res.status(400).json({ isSuccess: false, message: 'Parking lot is not active' });
            return;
        }

        
        const slotIndex = parkingLot.slots.findIndex(slot => slot.registration_number === registrationNumber);
        if (slotIndex === -1) {
            res.status(404).json({ isSuccess: false, message: 'Car not found in parking lot' });
            return;
        }

        
        parkingLot.slots[slotIndex].registration_number = '';
        parkingLot.slots[slotIndex].color = '';
        await parkingLot.save();

        res.status(200).json({
            isSuccess: true,
            response: {
                slotNumber: parkingLot.slots[slotIndex].slot_number,
                registrationNumber,
                status: 'LEFT'
            }
        });
    } catch (err) {
        res.status(500).json({ isSuccess: false, message: 'Error leaving car' });
    }
});


app.get('/api/parkings', async (req, res) => {
    try {
        const { color, parkingLotId } = req.body;

        
        const allowedColors = ['RED', 'GREEN', 'BLUE', 'BLACK', 'WHITE', 'YELLOW', 'ORANGE'];
        if (!allowedColors.includes(color)) {
            res.status(400).json({ isSuccess: false, error: { reason: 'Invalid color' } });
            return;
        }

        
        const parkingLot = await ParkingLot.findById(parkingLotId);
        if (!parkingLot) {
            res.status(404).json({ isSuccess: false, error: { reason: 'Parking lot not found' } });
            return;
        }

       
        if (!parkingLot.isActive) {
            res.status(400).json({ isSuccess: false, error: { reason: 'Parking lot is not active' } });
            return;
        }

       
        const cars = parkingLot.slots
            .filter(slot => slot.color === color && slot.registration_number)
            .sort((a, b) => a.createdAt - b.createdAt); 
        
        
        if (cars.length === 0) {
            res.status(404).json({ isSuccess: false, error: { reason: `No car found with color ${color}` } });
            return;
        }

        res.status(200).json({ isSuccess: true, response: cars });
    } catch (err) {
        res.status(500).json({ isSuccess: false, error: { reason: 'Error getting cars' } });
    }
});

app.get('/api/Slots', async (req, res) => {
    try {
        const { color, parkingLotId } = req.query;
        console.log(req.query)

        
        const allowedColors = ['RED', 'GREEN', 'BLUE', 'BLACK', 'WHITE', 'YELLOW', 'ORANGE'];
        if (!allowedColors.includes(color)) {
            res.status(400).json({ isSuccess: false, error: { reason: 'Invalid Color' } });
            return;
        }

        // Find the parking lot by ID
        const parkingLot = await ParkingLot.findById(parkingLotId);
        if (!parkingLot) {
            res.status(404).json({ isSuccess: false, error: { reason: 'Parking lot not found' } });
            return;
        }

        // Check if parking lot is active
        if (!parkingLot.isActive) {
            res.status(400).json({ isSuccess: false, error: { reason: 'Parking lot is not active' } });
            return;
        }

        // Find empty slots with the specified color in the parking lot and sort them by slot number
        const slots = parkingLot.slots
            .filter(slot => slot.color === color && !slot.registration_number) // Empty slots only
            .map(slot => ({ color: slot.color, slotNumber: slot.slot_number }))
            .sort((a, b) => a.slotNumber - b.slotNumber);
        
        res.status(200).json({ isSuccess: true, response: { slots } });
    } catch (err) {
        res.status(500).json({ isSuccess: false, error: { reason: 'Error getting slots' } });
    }
});

app.listen(8000, () => {
  console.log("server is listening at port 8000 ");
});
