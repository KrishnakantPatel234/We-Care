import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import { FaMicrophone, FaCamera, FaSearch, FaAmbulance, FaMapMarkedAlt, FaMapPin } from "react-icons/fa";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import L from "leaflet";
import "leaflet-routing-machine";
import { useSpeechToText } from "../utils/useSpeechToText";

// 📍 Marker icon
const markerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [35, 35],
});

// 🗺️ Manual click location selector
function LocationSetter({ setPosition, isSelecting, setIsSelecting }) {
  useMapEvents({
    click(e) {
      if (isSelecting) {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        setIsSelecting(false);
        alert("✅ Location set successfully!");
      }
    },
  });
  return null;
}

// 🧭 Routing Control
function Routing({ position, destination }) {
  const map = useMap();

  useEffect(() => {
    if (!destination || !position) return;

    const routingControl = L.Routing.control({
      waypoints: [L.latLng(position[0], position[1]), L.latLng(destination[0], destination[1])],
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      show: false,
      lineOptions: {
        styles: [{ color: "#1D4ED8", weight: 5, opacity: 0.9 }],
      },
      createMarker: () => null,
    }).addTo(map);

    return () => map.removeControl(routingControl);
  }, [destination]);

  return null;
}

export default function HealthMap() {
  const [position, setPosition] = useState(null);
  const [places, setPlaces] = useState([]);
  const [query, setQuery] = useState("hospital");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [destination, setDestination] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const mapRef = useRef();

  const { startListening } = useSpeechToText((text) => {
    setQuery(text);
    setTimeout(() => fetchNearbyPlaces(text), 500);
  });

  // ✅ Get user location (fallback: Medicaps University)
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {
        alert("Couldn't fetch GPS — showing Medicaps University, Indore by default.");
        setPosition([22.6040, 75.8070]);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // ✅ Fetch nearby places (OpenStreetMap)
  const fetchNearbyPlaces = async (search = query) => {
    if (!position) return alert("Location not detected yet.");
    setLoading(true);

    const [lat, lon] = position;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      search
    )}&bounded=1&limit=15&viewbox=${lon - 0.05},${lat + 0.05},${lon + 0.05},${lat - 0.05}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      setPlaces(data);
    } catch {
      alert("Error fetching map data. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Upload image → detect medicine (optional backend)
  const detectMedicineFromImage = async () => {
    if (!image) return alert("Upload an image first.");
    const formData = new FormData();
    formData.append("image", image);

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/map/detect-medicine", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.medicine) {
        setQuery(data.medicine);
        fetchNearbyPlaces("pharmacy");
      } else {
        alert("Could not detect medicine.");
      }
    } catch {
      alert("AI detection failed.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Show emergency hospitals
  const showEmergency = () => {
    setQuery("emergency hospital");
    fetchNearbyPlaces("emergency hospital");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center pb-8">
      <h1 className="text-3xl font-bold text-blue-600 mt-6 mb-2 text-center">
        🌍 WeCare HealthMap
      </h1>
      <p className="text-gray-600 mb-4 text-sm md:text-base text-center px-4">
        Find nearby hospitals, pharmacies, blood banks & get real-time directions
      </p>

      {/* 🔍 Controls */}
      <div className="flex flex-wrap justify-center gap-2 items-center mb-4 w-[92%] md:w-[70%]">
        <input
          type="text"
          placeholder="Search hospital, pharmacy, blood bank..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 p-3 rounded-lg border border-gray-300 outline-none shadow-sm focus:ring-2 focus:ring-blue-400 text-sm md:text-base"
        />
        <button onClick={() => fetchNearbyPlaces()} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700">
          <FaSearch />
        </button>
        <button onClick={startListening} className="p-3 bg-gray-200 rounded-full hover:bg-gray-300">
          <FaMicrophone className="text-blue-600" />
        </button>
        <button onClick={showEmergency} className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700">
          <FaAmbulance />
        </button>
      </div>

      {/* 📸 Image Upload */}
      <div className="flex flex-wrap gap-3 items-center mb-4 justify-center">
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} className="border border-gray-300 rounded-lg p-2 bg-white text-sm" />
        <button onClick={detectMedicineFromImage} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm text-sm md:text-base">
          <FaCamera /> Search Medicine Nearby
        </button>
      </div>

      {/* 📍 Manual Location Button */}
      <div className="mb-3">
        <button
          onClick={() => setIsSelecting(!isSelecting)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm text-sm md:text-base transition ${
            isSelecting
              ? "bg-yellow-500 text-white hover:bg-yellow-600"
              : "bg-gray-200 hover:bg-gray-300 text-gray-700"
          }`}
        >
          <FaMapPin /> {isSelecting ? "Click on Map to Set Location" : "Set My Location Manually"}
        </button>
      </div>

      {loading && <p className="text-gray-500 animate-pulse">🔍 Searching nearby places...</p>}

      {/* 🗺️ Map */}
      {position && (
        <div className="w-[95%] md:w-[80%] h-[70vh] rounded-lg overflow-hidden shadow-md border border-gray-200">
          <MapContainer ref={mapRef} center={position} zoom={14} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution="© OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Manual location selector */}
            <LocationSetter setPosition={setPosition} isSelecting={isSelecting} setIsSelecting={setIsSelecting} />

            {/* Current Location Marker */}
            <Marker position={position} icon={markerIcon}>
              <Popup>
                {isSelecting ? "Click to confirm your new location" : "📍 You are here (Medicaps University area)"}
              </Popup>
            </Marker>

            {/* Destination Route */}
            {destination && <Routing position={position} destination={destination} />}

            {/* Nearby Places */}
            {places.map((p, i) => (
              <Marker key={i} position={[p.lat, p.lon]} icon={markerIcon}>
                <Popup>
                  <div className="text-center">
                    <b className="text-gray-800">{p.display_name.split(",")[0]}</b>
                    <div className="flex flex-col gap-2 mt-2">
                      <button
                        onClick={() => setDestination([p.lat, p.lon])}
                        className="flex items-center gap-2 justify-center bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                      >
                        <FaMapMarkedAlt /> Show Route
                      </button>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline text-xs hover:text-blue-800"
                      >
                        Open in Google Maps
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
