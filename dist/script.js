const invoke = window.__TAURI__.invoke;
const { readTextFile, writeTextFile, createDir, BaseDirectory } =
  window.__TAURI__.fs;
const { documentDir, join } = window.__TAURI__.path;
const { message } = window.__TAURI__.dialog;
const clientsOutSelected = document.querySelector("#clientsOutSelected");
const clientsInSelected = document.querySelector("#clientsInSelected");
const presentExtend = document.querySelector("#presentExtendedTime");
const clientToExtend = document.querySelector("#clientToExtend");
const extendTimeInp = document.querySelector("#extendTime");
const extendTimeBut = document.querySelector("#extendBut");
const addBut = document.querySelector("#addBut");
const nameInp = document.querySelector("#name");
const surnameInp = document.querySelector("#surname");
const peselInp = document.querySelector("#pesel");
const enterBut = document.querySelector("#enter");
const leaveBut = document.querySelector("#leave");
const buts = document.querySelectorAll(".tabsBut");
const tabs = document.querySelectorAll(".tabs");
const DOCUMENT_PATH = await join(await documentDir(), "Siłownia");

let lists = { clientsOut: {}, clientsIn: {}, allClients: {}};
(async () => {
  let allUsers = await readFile("users.json");
  let usersInQueue = await readFile("queue.json");
  for (let user in allUsers) {
    lists["allClients"][user] = allUsers[user];
    if (usersInQueue?.[user]) lists["clientsIn"][user] = allUsers[user];
    else lists["clientsOut"][user] = allUsers[user];
  }
  addOptions("clientsOut");
  addOptions("clientsIn");
  addOptions("allClients");
})();

leaveBut.addEventListener("click", async () => await clientLeaves());
enterBut.addEventListener("click", async () => await clientEnters());
extendTimeBut.addEventListener("click", async () => await extendTime());
addBut.addEventListener("click", async () => await addClient());
extendTimeInp.addEventListener(
  "input",
  () => (presentExtend.innerHTML = extendTimeInp?.value)
);

buts.forEach((el) =>
  el.addEventListener("click", (e) => {
    let but = e.currentTarget;
    buts.forEach((el) => el.classList?.remove("selected"));
    but.classList.add("selected");
    tabs.forEach((el) => (el.style.display = "none"));
    document.getElementById(but.id.replace("But", "")).style.display = "flex";
  })
);
async function clientEnters() {
  let who = clientsOutSelected?.value;
  if (!who) return;
  clientsOutSelected.value = "";
  if(lists["allClients"][who]["carnetTime"] < 60)return errorHandler("Klient ma poniżej 60 minut na karnecie");
  let queue = await readFile("queue.json");
  if (queue[who]) return errorHandler("Ta osoba jest już na siłowni");
  let timeNow = new Date().getTime();
  queue[who] = timeNow;
  await writeFile("queue.json", JSON.stringify(queue, null, 2));
  let history = await readFile("history.json");
  if (!history["enter"]?.[who]) history["enter"][who] = [];
  history["enter"][who].push(timeNow);
  await writeFile("history.json", JSON.stringify(history, null));
  lists["clientsIn"][who] = lists["clientsOut"][who];
  delete lists["clientsOut"][who];
  updateDataLists();
}

async function clientLeaves() {
  let who = clientsInSelected?.value;
  if (!who) return;
  let queue = await readFile("queue.json");
  if (!queue[who]) return errorHandler("Tej osoby nie ma na siłowni");
  let timePassed = new Date().getTime() - queue[who];
  let usersData = await readFile("users.json");
  let newUserTime =
    usersData[who]["carnetTime"] - Math.floor(timePassed / 1000 / 60);
  if (newUserTime < 0) {
    usersData[who]["carnetTime"] = 0;
    return errorHandler(`Klient był za długo o ${0 - newUserTime} minut`);
  }
  usersData[who]["carnetTime"] = newUserTime;
  await writeFile("users.json", JSON.stringify(usersData, null, 2))
  delete queue[who];
  writeFile("queue.json", JSON.stringify(queue, null, 2));
  updateDataLists(usersData);
  let history = await readFile("history.json");
  if (!history["leave"]?.[who]) history["leave"][who] = [];
  history["leave"][who].push(new Date().getTime());
  writeFile("history.json", JSON.stringify(history, null, 2));
  lists["clientsOut"][who] = lists["clientsIn"][who];
  delete lists["clientsIn"][who];
  updateDataLists();
  clientsInSelected.value = "";
}

async function extendTime() {
  let who = clientToExtend?.value;
  if (!who) return errorHandler("Wybierz klienta");
  let time = extendTimeInp?.value;
  let usersData = await readFile("users.json");
  usersData[who]["carnetTime"] += time * 60;
  writeFile("users.json", JSON.stringify(usersData, null, 2))
  lists["allClients"] = usersData;
  if(lists["clientsOut"]?.[who])lists["clientsOut"][who] = usersData[who];
  if(lists["clientsIn"]?.[who])lists["clientsIn"][who] = usersData[who];
  updateDataLists();
  clientToExtend.value = "";
  errorHandler("Pomyślnie przedłużono karnet");
}

async function addClient() {
  let name = nameInp?.value;
  if (!name) return errorHandler("Podaj imię klienta");
  let surname = surnameInp?.value;
  if (!surname) return errorHandler("Podaj nazwisko klienta");
  let pesel = peselInp?.value;
  if (!pesel) return errorHandler("Podaj pesel klienta");
  if(pesel.length < 11)return errorHandler("Podaj prawidłowy pesel")
  let usersData = await readFile("users.json");
  if (usersData[pesel])
    return errorHandler(`Użytkownik o danym pesel jest już zarejestrowany`);
  usersData[pesel] = { name, surname, carnetTime: 0 };
  writeFile("users.json", JSON.stringify(usersData, null, 2))
  lists["allClients"] = usersData;
  lists["clientsOut"][pesel] = usersData[pesel];
  updateDataLists();
  errorHandler("Pomyślnie dodano klienta");
}

function addOptions(listName) {
  let list = lists[listName];
  for (let key in list) {
    let opt = document.createElement("option");
    opt.value = key;
    let { name, surname, carnetTime } = list[key];
    opt.innerHTML = `${name} ${surname} - ${carnetTime} minut`;
    document.getElementById(listName).appendChild(opt);
  }
}

function updateDataLists() {
  for (let listName in lists) {
    lists[listName] = Object.keys(lists[listName]).sort().reduce((obj, key) => {
      obj[key] = lists[listName][key];
      return obj;
    },{})
    abort(listName);
    addOptions(listName);
  }
}

async function writeFile(name, data) {
  await writeTextFile(await join(DOCUMENT_PATH, name), data, {
    dir: BaseDirectory.Document,
  });
}

async function readFile(name) {
  await createDataFolder(DOCUMENT_PATH);
  return JSON.parse(await readTextFile(await join(DOCUMENT_PATH, name)), {
    dir: BaseDirectory.Document,
  });
}
async function createDataFolder(path) {
  const folderExists = await invoke("is_path_valid", { path });
  if (folderExists) return;
  await createDir("Siłownia", {
    dir: BaseDirectory.Document,
    recursive: true,
  });
  await errorHandler(`Folder stworzony w: ${path}`);
  await writeFile("queue.json", "{}");
  let defaultData = {
    12345678910: {
      name: "Jakub",
      surname: "Meowtysiak",
      carnetTime: 1154,
    },
    12345678911: {
      name: "Eryk",
      surname: "Makłowicz",
      carnetTime: 561,
    },
    12345678912: {
      name: "Tomasz",
      surname: "Łoinnnnnn",
      carnetTime: 600,
    },
  };
  await writeFile("users.json", JSON.stringify(defaultData, null, 2));
  await writeFile("history.json", `{"enter": {}, "leave": {}}`);
}

function abort(id) {
  let el = document.getElementById(id);
  while (el?.lastChild) {
    el.removeChild(el.lastChild);
  }
}

async function errorHandler(err) {
  await message(err);
}