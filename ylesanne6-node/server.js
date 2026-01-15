const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios"); // Installi: npm install axios

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data", "products.json");
const favoritesFilePath = path.join(__dirname, "data", "favorites.json");

// 1. ANDMETE HALDUS
// Funktsioon, mis tõmbab välised andmed ja salvestab faili
const fetchAndSaveProducts = async () => {
  try {
    const response = await axios.get("https://fakestoreapi.com/products"); // Sinu väline allikas
    fs.writeFileSync(DATA_FILE, JSON.stringify(response.data, null, 2));
    console.log("Andmed edukalt uuendatud!");
  } catch (error) {
    console.error("Viga andmete pärimisel:", error);
  }
};

// Funktsioon: Kontrolli, kas fail on tühi
const isFileEmpty = (file) => {
  try {
    const rawData = fs.readFileSync(file, "utf-8");
    return !rawData.trim(); // Kontrollime, kas fail on tühi (või ainult tühikud)
  } catch (error) {
    console.error("Viga faili lugemisel", error);
    return true; // Kui tekib viga, eeldame, et fail on tühi või puudub
  }
};

// Kontrolli, kas fail on tühi
const emptyFile = isFileEmpty(DATA_FILE);
// Käivitame andmete sisesamise serveri käivitumisel, kui meie fail on tühi
emptyFile && fetchAndSaveProducts();

// 2. API ROUTES (Andmete jagamine frontendile)

// Kõik tooted (või kategooria järgi)
app.get("/api/products", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    const category = req.query.category;
    if (category) {
      const filtered = data.filter((p) => p.category === category);
      return res.status(200).json(filtered);
    }
    res.status(200).json(data);
  } catch (error) {
    res.status(404).json({ message: "Andmete lugemine ebaõnnestus" });
  }
});

// Üksik toode ID järgi
app.get("/api/products/:id", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    const product = data.find((p) => p.id === parseInt(req.params.id));

    if (!product) return res.status(404).send("Toodet ei leitud"); //see on valikuline

    res.status(200).json(product);
  } catch (error) {
    res.status(404).json({ message: "Andmete lugemine ebaõnnestus" });
  }
});

// Endpoint to get categories
app.get("/api/categories", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    const categories = data.map((item) => item.category);
    const uniqueArray = ["all", ...new Set(categories)];

    if (uniqueArray) {
      res.status(200).json(uniqueArray);
    } else {
      res.status(404).json({ message: "Kategooria lugemine ebaõnnestus" });
    }
  } catch (error) {
    res.status(404).json({ message: "Andmete lugemine ebaõnnestus" });
  }
});
// Endpoint to get a favorites products by client id
app.get("/api/favorites/:userID", (req, res) => {
  try {
    const isEmptyFavorites = isFileEmpty(favoritesFilePath);
    if (!isEmptyFavorites) {
      const favoritesData = JSON.parse(
        fs.readFileSync(favoritesFilePath, "utf-8")
      );

      console.log("fav", favoritesData);

      const favoritesIds = favoritesData[req.params.userID] || [];
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

      const products =
        data.filter((product) => favoritesIds.includes(product.id)) || [];

      res.status(200).json(products);
    } else {
      res.status(200).json([]);
    }
  } catch (error) {
    res.status(404).json({ message: "Andmete lugemine ebaõnnestus" });
  }
});
// Endpoint to add a favorite product by ID
app.post("/api/favorites/:userID/:productId", (req, res) => {
  try {
    const emptyFile = isFileEmpty(favoritesFilePath);
    if (emptyFile) {
      //make the object, that has client id as key and array of product ids as value
      const newData = {
        [req.params.userID]: [parseInt(req.params.productId)],
      };
      fs.writeFileSync(favoritesFilePath, JSON.stringify(newData, null, 2));
      return res.status(200).json(newData);
    }

    const favoritesData = JSON.parse(
      fs.readFileSync(favoritesFilePath, "utf-8")
    );

    //take the client favorite product id array from file
    const favoritesIds = favoritesData[req.params.userID] || [];

    //add id to the file array
    favoritesIds.push(parseInt(req.params.productId));
    const uniqueIds = [...new Set(favoritesIds)];
    favoritesData[req.params.userID] = uniqueIds;

    // write new array to file
    fs.writeFileSync(favoritesFilePath, JSON.stringify(favoritesData, null, 2));
    //See json, mis sa siin tagastad on näha ka veebilhitseja network tab'is
    res.status(200).json(uniqueIds);
  } catch (error) {
    res
      .status(404)
      .json({ message: "Andmete kirjutamine lemmikutesse ebaõnnestus" });
  }
});
// Endpoint to delete a favorite product by ID
app.delete("/api/favorites/:userID/:productId", async (req, res) => {
  try {
    const favoritesData = JSON.parse(
      await fs.readFile(favoritesFilePath, "utf-8")
    );
    //take the client favorite product id array from file
    const favoritesIds = favoritesData[req.params.userID] || [];
    //delete id from the file

    const newArray = favoritesIds.filter(
      (id) => id !== parseInt(req.params.productId)
    );
    favoritesData[req.params.userID] = newArray;
    // write new array to file
    await fs.writeFile(
      favoritesFilePath,
      JSON.stringify(favoritesData, null, 2)
    );

    res.status(200).json(favoritesData);
  } catch (error) {
    res.status(404).json({ message: "Andmete kirjutamine ebaõnnestus" });
  }
});

// 2. MIDDLEWARE
// app.use(express.static("public")); // Lubab juurdepääsu public kausta failidele

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// 4. SPA ROUTING (Oluline!)
// See peab olema viimane route. Kui keegi läheb /cart või /product/1,
// siis server annab ikka index.html, ja sinna sisse ehitatud JS otsustab, mida näidata.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server töötab: http://localhost:${PORT}`);
});
