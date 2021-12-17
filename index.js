const { Extension, HPacket, HDirection, HMessage, HEntity } = require('gnode-api');
const notifier = require('node-notifier');

let myIndex;
let state = true;
let users = []

// Use package.json as extensionInfo or create an object including 'name', 'description', 'version' and 'author'
let extensionInfo = require('./package.json');

// Create new extension with extensionInfo
let ext = new Extension(extensionInfo);

// Start connection to G-Earth
process
.on("unhandledRejection", (reason, p) => {
    ext.writeToConsole(
        `${reason.toString()} Unhandled Rejection at Promise ${p.toString()}`
    );
})
.on("uncaughtException", (err) => {
    ext.writeToConsole(`${err.toString()} Uncaught Exception thrown`);
});

ext.run();

ext.interceptByNameOrHash(HDirection.TOCLIENT, "Users", async (hMessage) => {
    let hPacket = hMessage.getPacket()
    let usersParser = HEntity.parse(hPacket)

    if (usersParser.length >= 2) {
        usersParser.forEach(u => {
            users.push({index: u.getIndex(), name: u.getName()})
        })
    } else if (usersParser.length === 1 && !myIndex) {
        myIndex = usersParser[0].getIndex()
    }
});

ext.interceptByNameOrHash(HDirection.TOCLIENT, 'Whisper', async (hMessage) => {

    if (!state) return

    let hPacket = hMessage.getPacket();
    let vars = hPacket.read('iSiiii');
    let message = vars[1];
    let index = vars[0];
    if (myIndex === index) return
    let userName = users.find(u => u.index === index);
        notifier.notify({
            title: `${userName.name}`,
            appID: 'Whisper Notify',
            message: `${message}`,
            icon: 'img/ico.png',
        });

})

ext.interceptByNameOrHash(HDirection.TOSERVER, "Chat", (hMessage) => {
    let hPacket = hMessage.getPacket();
    let message = hPacket.readString();
    
        if (message.startsWith("!")) {
        hMessage.setBlocked(true);
    
        if (message.startsWith("!whisper")) {
            if (!state) {
            state = true;
            createMessage("You turned on");
            } else {
            state = false;
            createMessage("You turned off");
            }
        }
        }
    });

async function createMessage(text) {
    let messagePacket = new HPacket(
        `{in:NotificationDialog}{s:""}{i:3}{s:"display"}{s:"BUBBLE"}{s:"message"}{s:"Whisper Notify\n\n${text}"}{s:"image"}{s:"https://i.ibb.co/w6gn9j9/icon-copiar.png"}`
    );

    ext.sendToClient(messagePacket);
}