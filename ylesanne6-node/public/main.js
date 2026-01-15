import { Product } from "./constructors/Product.js";
import { displayAllProductsView } from "./views/allProductsView.js";
import { navigate } from "./router.js";
import { getAllCategory } from "./api.js";
import { customerConstructor } from "./constructors/Customer.js";

const initApp = async () => {
  const USER_ID = sessionStorage.getItem("userID");
  console.log(USER_ID);
  if (!USER_ID) {
    customerConstructor.login("Maret");
  }
  console.log(USER_ID);

  const homeButton = document.getElementById("home-button");
  homeButton.onclick = () => navigate("allProducts");

  const favoritesButton = document.getElementById("favorites-button");
  favoritesButton.className = USER_ID ? "show" : "hidden";
  favoritesButton.onclick = () => navigate("favorites");

  const cartButton = document.getElementById("cart-button");
  cartButton.onclick = () => navigate("cart");

  //võtan kategooriad andmebaasist ja kuvan päises
  const categories = await getAllCategory();
  const categoryMenu = document.getElementById("categories");

  categories.forEach((category) => {
    const categoryElement = document.createElement("button");
    categoryElement.textContent = category;
    categoryElement.onclick = () => navigate("allProducts", category);
    categoryMenu.appendChild(categoryElement);
  });

  // NB!! Kui sul on ainult kategooriate põhjal vaated, siis lisa siis esimene kategooria kaasa
  //   displayAllProductsView(categories[0]);

  // displayAllProductsView();

  const path = window.location.pathname;

  // 2. Otsusta, millist vaadet näidata
  if (path === "/favorites") {
    navigate("favorites", null, false);
  } else if (path === "/cart") {
    navigate("cart", null, false);
  } else if (path.startsWith("/product/")) {
    const id = path.split("/").pop();
    navigate("productDetail", id, false);
  } else if (path.startsWith("/category/")) {
    const cat = path.split("/").pop();
    navigate("allProducts", cat, false);
  } else {
    // Vaikimisi esileht
    navigate("allProducts", "all", false);
  }
};

document.addEventListener("DOMContentLoaded", initApp);
