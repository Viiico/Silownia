const invoke = window.__TAURI__.invoke;
const { readTextFile, writeTextFile, createDir, BaseDirectory } =
  window.__TAURI__.fs;
const { documentDir, join } = window.__TAURI__.path;
const { message } = window.__TAURI__.dialog;
const clientSelect = document.querySelector("#client");
const clientSelected = document.querySelector("#clientSelected");
const presentExtend = document.querySelector("#presentExtendedTime");
const clientToExtend = document.querySelector("#clientToExtend");
const extendTimeInp = document.querySelector("#extendTime");
const extendTimeButton = document.querySelector("#extendBut");
const addBut = document.querySelector("#addBut");
const nameInp = document.querySelector("#name");
const surnameInp = document.querySelector("#surname");
const peselInp = document.querySelector("#pesel");
const enterBut = document.querySelector("#enter");
const leaveBut = document.querySelector("#leave");
const buts = document.querySelectorAll(".tabsBut");
const tabs = document.querySelectorAll(".tabs");
(async () => await updateData(await readFile("users.json")))();

leaveBut.addEventListener("click", async () => await clientLeaves());
enterBut.addEventListener("click", async () => await clientEnters());
extendBut.addEventListener("click", async () => await extendTime());
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
  let who = clientSelected?.value;
  if (!who) return;
  let queue = await readFile("queue.json");
  if (queue[who]) return errorHandler("Ta osoba jest już na siłowni");
  let timeNow = new Date().getTime();
  queue[who] = timeNow;
  let newQueue = JSON.stringify(queue, null, 2);
  await writeTextFile("Siłownia//queue.json", newQueue, {
    dir: BaseDirectory.Document,
  });
  let history = await readFile("history.json");
  if (!history["enter"]?.[who]) history["enter"][who] = [];
  console.log(history);
  history["enter"][who].push(timeNow);
  let newHistory = JSON.stringify(history, null, 2);
  await writeTextFile("Siłownia//history.json", newHistory, {
    dir: BaseDirectory.Document,
  });
}
async function clientLeaves() {
  let who = clientSelected?.value;
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
  let newData = JSON.stringify(usersData, null, 2);
  await writeTextFile("Siłownia//users.json", newData, {
    dir: BaseDirectory.Document,
  });
  delete queue[who];
  let newQueue = JSON.stringify(queue, null, 2);
  await writeTextFile("Siłownia//queue.json", newQueue, {
    dir: BaseDirectory.Document,
  });
  updateData(usersData);
  let history = await readFile("history.json");
  if (!history["leave"]?.[who]) history["leave"][who] = [];
  console.log(history);
  history["leave"][who].push(new Date().getTime());
  let newHistory = JSON.stringify(history, null, 2);
  await writeTextFile("Siłownia//history.json", newHistory, {
    dir: BaseDirectory.Document,
  });
}

async function extendTime() {
  let who = clientToExtend?.value;
  if (!who) return errorHandler("Wybierz klienta");
  let time = extendTimeInp?.value;
  let usersData = await readFile("users.json");
  usersData[who]["carnetTime"] += time * 60;
  let newData = JSON.stringify(usersData, null, 2);
  writeTextFile("Siłownia//users.json", newData, {
    dir: BaseDirectory.Document,
  });
  errorHandler("Pomyślnie przedłużono karnet");
  updateData(usersData);
}

async function addClient() {
  let name = nameInp?.value;
  if (!name) return errorHandler("Podaj imię klienta");
  let surname = surnameInp?.value;
  if (!surname) return errorHandler("Podaj nazwisko klienta");
  let pesel = peselInp?.value;
  if (!pesel) return errorHandler("Podaj pesel klienta");
  let usersData = await readFile("users.json");
  if (usersData[pesel])
    return errorHandler(`Użytkownik o danym pesel jest już zarejestrowany`);
  usersData[pesel] = { name, surname, carnetTime: 0 };
  let newData = JSON.stringify(usersData, null, 2);
  writeTextFile("Siłownia//users.json", newData, {
    dir: BaseDirectory.Document,
  });
  errorHandler("Pomyślnie dodano klienta");
  updateData(usersData);
}

async function updateData(usersData) {
  while (clientSelect?.lastChild) {
    clientSelect?.removeChild(clientSelect?.lastChild);
  }
  for (let key in usersData) {
    let opt = document.createElement("option");
    opt.value = key;
    let { name, surname, carnetTime } = usersData[key];
    opt.innerHTML = `${name} ${surname} - ${carnetTime} minut`;
    clientSelect.appendChild(opt);
  }
}

async function readFile(name) {
  const path = await join(await documentDir(), "Siłownia");
  await createDataFolder(path);
  return JSON.parse(await readTextFile(await join(path, name)), {
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
  await writeTextFile("Siłownia//queue.json", "{}", {
    dir: BaseDirectory.Document,
  });

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
  await writeTextFile(
    "Siłownia//users.json",
    JSON.stringify(defaultData, null, 2),
    {
      dir: BaseDirectory.Document,
    }
  );
  await writeTextFile("Siłownia//history.json", `{"enter": {}, "leave": {}}`, {
    dir: BaseDirectory.Document,
  });
}

async function errorHandler(err) {
  await message(err);
}
