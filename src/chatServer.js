const chalk = require('chalk');

const { deleteVideos, stringify, log } = require('./utils');

let numUsers = 0;
const usersCount = {};
const sum = x => Object.values(x).reduce((acc, v) => acc + v, 0);
const userAdd = (user, x = 1) => {
  if (user === 'Admin') return sum(usersCount);

  if (!usersCount[user]) {
    usersCount[user] = 1;

    return sum(usersCount);
  }

  usersCount[user] += x;

  return sum(usersCount);
};

// io -> Promise -> socket
function chatServer(io) {
  return new Promise((resolve) => {
    io.on('connection', (socket) => {
      let addedUser = false;
      resolve(socket);

      socket.on('reset', () => {
        deleteVideos();
        socket.broadcast.emit('restart', { message: 'Server restarted please refresh' });
      });

      // When the client emits 'new message', this listens and executes
      socket.on('new message', (data) => {
        // we tell the client to execute 'new message'
        socket.broadcast.emit('new message', {
          username: socket.username,
          message: data,
        });
      });

      // When the client emits 'add user', this listens and executes
      socket.on('add user', (username) => {
        if (addedUser) return;

        // we store the username in the socket session for this client
        socket.username = username;

        numUsers = userAdd(username);
        addedUser = true;

        if (usersCount.Admin) delete usersCount.Admin;

        socket.emit('login', { numUsers, usersCount });

        // echo globally (all clients) that a person has connected
        socket.broadcast.emit('user joined', {
          username: socket.username,
          numUsers,
          usersCount,
        });

        log('-----------------------');
        console.log(chalk.bold('In ') + chalk.green(` > ${socket.username}`));
        console.log(stringify(usersCount));
        console.log(chalk.bold('Total: ') + chalk.yellow(numUsers));
      });

      // When the client emits 'typing', we broadcast it to others
      socket.on('typing', () => {
        socket.broadcast.emit('typing', { username: socket.username });
      });

      socket.on('stop typing', () => {
        socket.broadcast.emit('stop typing', { username: socket.username });
      });

      // When the user disconnects.
      socket.on('disconnect', () => {
        if (addedUser) {
          numUsers = userAdd(socket.username, -1);

          // echo globally that this client has left
          socket.broadcast.emit('user left', {
            username: socket.username,
            numUsers,
            usersCount,
          });

          log('-----------------------');
          console.log(chalk.bold('Out') + chalk.red(` < ${socket.username}`));
          console.log(stringify(usersCount));
          console.log(chalk.bold('Total: ') + chalk.yellow(numUsers));
        }
      });
    });
  });
}

module.exports = chatServer;
