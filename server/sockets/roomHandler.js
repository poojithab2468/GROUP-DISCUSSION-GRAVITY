const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

module.exports = (io, socket) => {
  // Join or Create Room logic
  socket.on('create_room', async (data, callback) => {
    try {
      const { name, topic, maxParticipants, durationMinutes, hostName, hostId } = data;
      const roomId = generateRoomCode();
      const newRoom = new Room({
        roomId,
        name,
        topic,
        maxParticipants,
        durationMinutes,
        hostId,
        participants: [{
          userId: hostId,
          name: hostName,
          socketId: socket.id
        }]
      });
      await newRoom.save();
      socket.join(roomId);
      callback({ success: true, roomId });
    } catch (error) {
      console.error(error);
      callback({ success: false, error: 'Failed to create room' });
    }
  });

  socket.on('join_room', async (data, callback) => {
    try {
      const { roomId, userId, userName } = data;
      const room = await Room.findOne({ roomId, status: 'waiting' });
      if (!room) return callback({ success: false, error: 'Room not found or already started' });
      
      if (room.participants.length >= room.maxParticipants) {
        return callback({ success: false, error: 'Room is full' });
      }

      // Check if user already in room
      const existing = room.participants.find(p => p.userId === userId);
      if (existing) {
        existing.socketId = socket.id;
      } else {
        room.participants.push({ userId, name: userName, socketId: socket.id });
      }

      await room.save();
      socket.join(roomId);
      
      // Notify others in room
      io.to(roomId).emit('room_updated', room);
      callback({ success: true, room });
    } catch (error) {
      console.error(error);
      callback({ success: false, error: 'Error joining room' });
    }
  });

  socket.on('start_session', async (data, callback) => {
    try {
      const { roomId, hostId } = data;
      const room = await Room.findOne({ roomId, hostId });
      if (!room) return callback({ success: false, error: 'Unauthorized or room not found' });
      
      room.status = 'active';
      room.startTime = new Date();
      await room.save();
      
      io.to(roomId).emit('session_started', { startTime: room.startTime, durationMinutes: room.durationMinutes });
      callback({ success: true });
    } catch (error) {
      console.error(error);
      callback({ success: false, error: 'Error starting session' });
    }
  });

  socket.on('user_speaking', (data) => {
    const { roomId, userId, isSpeaking } = data;
    // Broadcast to room except sender
    socket.to(roomId).emit('participant_speaking', { userId, isSpeaking });
  });

  socket.on('end_session', async (data, callback) => {
      try {
        const { roomId } = data;
        const room = await Room.findOne({ roomId, status: 'active' });
        if (room) {
          room.status = 'completed';
          room.endTime = new Date();
          await room.save();
          io.to(roomId).emit('session_ended', { roomId });
        }
        if (callback) callback({ success: true });
      } catch (error) {
        console.error(error);
      }
  });

  socket.on('disconnect', async () => {
    // Basic disconnect handling: If user was in a waiting room, we might want to remove them.
    // For simplicity, relying on reconnect flows.
  });
};
