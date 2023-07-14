const { ErrorHandler, UnauthorizedError } = require('../utils/ErrorHandler');

module.exports = {
    onConnection: async (services, socket) => {
        console.log(socket.id, socket.rooms, socket.handshake.auth.token, socket.data.user?.username);
        if(socket.data.user) {
			try {
				await services.userService.setUserOnline(socket.data.user);

				const gameIdsOfSocket = await services.userService.getGamesOfUser(socket.data.user);
				if(gameIdsOfSocket.length) {
					const gameRoomsOfSocket = gameIdsOfSocket.map(gameId => ('game-' + gameId));
					socket.in(gameRoomsOfSocket).emit('playerOnlineStatus', socket.data.user.username, true);
				}
			} catch(error) {
				socket.emit('errorOccured', ErrorHandler.handle(error).message);
			}
        }
    },
	onDisconnecting: async (io, socket) => {
		const socketName = socket.data.user
			? socket.data.user.username
			: socket.id;
		const socketGameRooms = Array.from(socket.rooms).filter(roomName => roomName.startsWith('game-'));
		console.log(socket.rooms, socketGameRooms);

		for(const gameRoom of socketGameRooms) {
			const roomSockets = await io.in(gameRoom).fetchSockets();
	
			io.in(gameRoom).emit('userLeftGameRoom', socketName, roomSockets.length);
		}
	},
	onDisconnect: async (services, socket) => {
		if(socket.data.user) {
			await services.userService.setUserOffline(socket.data.user);

			const gameIdsOfSocket = await services.userService.getGamesOfUser(socket.data.user);
			if(gameIdsOfSocket.length) {
				const gameRoomsOfSocket = gameIdsOfSocket.map(gameId => ('game-' + gameId));
				socket.in(gameRoomsOfSocket).emit('playerOnlineStatus', socket.data.user.username, false);
			}
		}

	},
    onAuthenticated: async (services, socket, token) => {
		socket.handshake.auth.token = token;

		try {
			const userDTO = await services.userService.authenticate(token);
			socket.data.user = userDTO;

			services.userService.setUserOnline(socket.data.user);

			const gameIdsOfSocket = await services.userService.getGamesOfUser(socket.data.user);
			if(gameIdsOfSocket.length) {
				const gameRoomsOfSocket = gameIdsOfSocket.map(gameId => ('game-' + gameId));
				socket.in(gameRoomsOfSocket).emit('playerOnlineStatus', socket.data.user.username, true);
			}

			socket.join(userDTO.username);
		} catch(error) {
			socket.emit('errorOccured', ErrorHandler.handle(error).message);
		}
	},
    onLoggedOut: async (io, services, socket) => {
		// TODO: On log out or on disconnection, set a timeout that will
		// dequeue user if user is already in queue
		if(socket.data.user && socket.handshake.auth.token) {
			await services.userService.setUserOffline(socket.data.user);

			const gameIdsOfSocket = await services.userService.getGamesOfUser(socket.data.user);
			if(gameIdsOfSocket.length) {
				const gameRoomsOfSocket = gameIdsOfSocket.map(gameId => ('game-' + gameId));
				socket.in(gameRoomsOfSocket).emit('playerOnlineStatus', socket.data.user.username, false);
			}
			
			const socketGameRooms = Array.from(socket.rooms).filter(roomName => roomName.startsWith('game-'));
			for(let gameRoom of socketGameRooms) {
				const roomSockets = await io.in(gameRoom).fetchSockets();
		
				io.in(gameRoom).emit('userLeftGameRoom', socket.data.user.username, roomSockets.length);
			}
	
			delete socket.handshake.auth.token;
			delete socket.data.user;
		}
	},
	onPlay: (io, services, socket, preferences) => {
		// TODO: Add authentication validation to play, cancel, fetchQueueData
		// and other authentication required listeners and return error if user is not
		// authenticated. Preferably, find a way to implement such middleware to
		// specified listeners
		const gameService = services.gameService;

		gameService.enqueue(socket.data.user, preferences);

		const inQueue = gameService.queue.length;

		socket.join('queue');

		socket.emit('searching', {
			inQueue
		});

		io.in('queue').emit('queueUpdated', {
			inQueue
		});
	},
	onFetchQueueData: (services, socket, callback) => {
		const inQueue = services.gameService.queue.length;
		const timeElapsed = services.gameService.timeElapsedOfUser(socket.data.user.username);

		callback({ inQueue, timeElapsed });
	},
	onCancel: (io, services, socket) => {
		const gameService = services.gameService;
		
		gameService.dequeue(socket.data.user);

		const inQueue = gameService.queue.length;

		socket.emit('cancelled');

		io.in('queue').emit('queueUpdated', {
			inQueue
		});
	},
	onJoinGameRoom: async (io, socket, gameId) => {
		const socketName = socket.data.user
			? socket.data.user.username
			: socket.id;
		const gameRoom = 'game-' + gameId;

		socket.join(gameRoom);

		const roomSockets = await io.in(gameRoom).fetchSockets();

		io.in(gameRoom).emit('userJoinedGameRoom', socketName, roomSockets.length);
	},
	onLeaveGameRoom: async (io, socket, gameId) => {
		const socketName = socket.data.user
			? socket.data.user.username
			: socket.id;
		const gameRoom = 'game-' + gameId;

		socket.leave(gameRoom);

		const roomSockets = await io.in(gameRoom).fetchSockets();

		io.in(gameRoom).emit('userLeftGameRoom', socketName, roomSockets.length);
	},
	onGameChatMessage: async (io, services, socket, gameId, message) => {
		if(!socket.data.user) {
			socket.emit('errorOccured', new UnauthorizedError().message);
			return;
		}

		try {
			const userId = await services.userService.getUserIdByUser(socket.data.user);

			const chatEntry = await services.gameService.createChatEntryByGameId(gameId, userId, message);

			io.in('game-' + gameId).emit('gameChatMessage', chatEntry);
		} catch(error) {
			socket.emit('errorOccured', error.message);
		}
	},
	onCancelGame: async (io, services, socket, gameId) => {
		if(!socket.data.user) {
			socket.emit('errorOccured', new UnauthorizedError().message);
			return;
		}

		try {
			const cancelGameResult = await services.gameService.cancelGame(gameId, socket.data.user.username);

			if(cancelGameResult.cancelledBy && cancelGameResult.latestSystemChatEntry) {
				io.in('game-' + gameId).emit('gameCancelled', cancelGameResult.cancelledBy);
				io.in('game-' + gameId).emit('gameChatMessage', cancelGameResult.latestSystemChatEntry);
			}
		} catch(error) {
			socket.emit('errorOccured', error.message);
		}
	}
};