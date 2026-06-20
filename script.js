//DOM References
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const unitToggle = document.getElementById("unit-toggle");
const searchHistory = document.getElementById("search-history");
const errorMessage = document.getElementById("error-message");
const loadingMessage = document.getElementById("loading-message");
const weatherIcon = document.getElementById("weather-icon");
const cityName = document.getElementById("city-name");
const countryName = document.getElementById("country");
const temperature = document.getElementById("temperature");
const weatherDescription = document.getElementById("weather-description");
const humidity = document.querySelector("#humidity .value");
const windSpeed = document.querySelector("#wind-speed .value");
const uvIndex = document.querySelector("#uv-index .value");
const forecast = document.getElementById("forecast");
//Global variables
let currentWeatherData = null;
let currentCity = "";
let currentCountry = "";
let currentUnit = "C";
let searchList = JSON.parse(localStorage.getItem("weatherSearchHistory")) || [];

// Getting latitude, longitude, city name, and country from the user's city search.
async function getCoordinates(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const response = await fetch(url);
    // if statement use to check the response
    if (!response.ok) {
        throw new Error("Could not connect to the location service.");
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        throw new Error("City not found. Please check the spelling and try again.");
    }

    return data.results[0];
}

// Getting weather information from Open-Meteo using latitude and longitude.
async function getWeather(latitude, longitude) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto&forecast_days=5`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Could not fetch weather data. Please try again.");
    }

    return await response.json();
}

// Gets weather information for the user's current browser location.
function getWeatherByLocation() {
    if (!navigator.geolocation) {
        handleSearch("Lagos");
        return;
    }

    showLoading("Detecting your location...");

    navigator.geolocation.getCurrentPosition(
        async function (position) {
            try {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                const weatherData = await getWeather(latitude, longitude);
                currentWeatherData = weatherData;
                currentCity = "Your Location";
                currentCountry = "";
                displayCurrentWeather(weatherData, currentCity, currentCountry);
                displayForecast(weatherData.daily);
                clearMessages();
            } catch (error) {
                showError(error.message);
                handleSearch("Lagos");
            }
        },
        function () {
            handleSearch("Lagos");
        }
    );
}

// Converts Celsius to Fahrenheit when the unit toggle is used.
function convertTemperature(value) {
    if (currentUnit === "F") {
        return Math.round((value * 9) / 5 + 32);
    }

    return Math.round(value);
}

// Returns the correct temperature symbol for the selected unit.
function getUnitSymbol() {
    return currentUnit === "F" ? "F" : "C";
}

// Updates the page with the current weather data.
function displayCurrentWeather(data, city, country) {
    const weather = getWeatherDescription(data.current.weather_code);

    cityName.textContent = city;
    countryName.textContent = country ? `, ${country}` : "";
    temperature.textContent = `${convertTemperature(data.current.temperature_2m)}°${getUnitSymbol()}`;
    weatherDescription.textContent = weather.description;
    weatherIcon.textContent = weather.icon;
    weatherIcon.className = weather.animation;

    humidity.textContent = `${data.current.relative_humidity_2m}%`;
    windSpeed.textContent = `${Math.round(data.current.wind_speed_10m)} km/h`;
    uvIndex.textContent = data.daily.uv_index_max ? getUvLevel(data.daily.uv_index_max[0]) : "N/A";
}

// Updates the page with the 5-day forecast.
function displayForecast(daily) {
    forecast.innerHTML = "";

    for (let index = 0; index < daily.time.length; index++) {
        const date = new Date(daily.time[index]);
        const dayName = index === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "long" });
        const weather = getWeatherDescription(daily.weather_code[index]);
        const high = convertTemperature(daily.temperature_2m_max[index]);
        const low = convertTemperature(daily.temperature_2m_min[index]);

        const row = document.createElement("div");
        row.className = "forecast-row";
        row.innerHTML = `
            <span>${dayName}</span>
            <span>${weather.icon}</span>
            <span>${high}° / ${low}°</span>
        `;

        forecast.appendChild(row);
    }
}

// Converts WMO weather codes into readable descriptions, icons, and animation classes.
function getWeatherDescription(code) {
    if (code === 0) {
        return { description: "Clear sky", icon: "☀️", animation: "animate-spin" };
    }

    if ([1, 2, 3].includes(code)) {
        return { description: "Partly cloudy", icon: "⛅", animation: "animate-pulse" };
    }

    if ([45, 48].includes(code)) {
        return { description: "Foggy", icon: "🌫️", animation: "animate-pulse" };
    }

    if ([51, 53, 55].includes(code)) {
        return { description: "Drizzle", icon: "🌦️", animation: "animate-bounce" };
    }

    if ([61, 63, 65].includes(code)) {
        return { description: "Rain", icon: "🌧️", animation: "animate-bounce" };
    }

    if ([71, 73, 75].includes(code)) {
        return { description: "Snow", icon: "❄️", animation: "animate-pulse" };
    }

    if ([80, 81, 82].includes(code)) {
        return { description: "Rain showers", icon: "🌦️", animation: "animate-bounce" };
    }

    if (code === 95) {
        return { description: "Thunderstorm", icon: "⛈️", animation: "animate-pulse" };
    }

    return { description: "Unknown weather", icon: "🌡️", animation: "animate-pulse" };
}

// Converts the UV index number into a simple level for the stats row.
function getUvLevel(value) {
    if (value < 3) return "Low";
    if (value < 6) return "Moderate";
    if (value < 8) return "High";
    if (value < 11) return "Very High";
    return "Extreme";
}

// Shows an error message and hides the loading message.
function showError(message) {
    errorMessage.textContent = message;
    loadingMessage.textContent = "";
}

// Shows a loading message while weather data is being fetched.
function showLoading(message = "Loading...") {
    loadingMessage.textContent = message;
    errorMessage.textContent = "";
}

// Clears error and loading messages.
function clearMessages() {
    errorMessage.textContent = "";
    loadingMessage.textContent = "";
}

// Saves the last 5 searched cities and refreshes the history buttons.
function saveSearch(city) {
    const formattedCity = city.trim();
    searchList = searchList.filter(item => item.toLowerCase() !== formattedCity.toLowerCase());
    searchList.unshift(formattedCity);
    searchList = searchList.slice(0, 5);
    localStorage.setItem("weatherSearchHistory", JSON.stringify(searchList));
    displaySearchHistory();
}

// Displays search history buttons from localStorage.
function displaySearchHistory() {
    searchHistory.innerHTML = "";

    searchList.forEach(function (city) {
        const button = document.createElement("button");
        button.className = "history-btn";
        button.textContent = city;
        button.addEventListener("click", function () {
            cityInput.value = city;
            handleSearch(city);
        });

        searchHistory.appendChild(button);
    });
}

// The function Runs when the user searches for a city.
async function handleSearch(cityFromHistory) {
    const city = cityFromHistory || cityInput.value.trim();

    if (city === "") {
        showError("Please enter a city name.");
        return;
    }

    try {
        showLoading();
        const location = await getCoordinates(city);
        const weatherData = await getWeather(location.latitude, location.longitude);

        currentWeatherData = weatherData;
        currentCity = location.name;
        currentCountry = location.country;

        displayCurrentWeather(weatherData, currentCity, currentCountry);
        displayForecast(weatherData.daily);
        saveSearch(location.name);
        clearMessages();
    } catch (error) {
        showError(error.message);
    }
}

searchButton.addEventListener("click", function () {
    handleSearch();
});

cityInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        handleSearch();
    }
});

unitToggle.addEventListener("click", function () {
    currentUnit = currentUnit === "C" ? "F" : "C";
    unitToggle.textContent = currentUnit === "C" ? "Switch to F°" : "Switch to C°";

    if (currentWeatherData) {
        displayCurrentWeather(currentWeatherData, currentCity, currentCountry);
        displayForecast(currentWeatherData.daily);
    }
});

displaySearchHistory();
getWeatherByLocation();
