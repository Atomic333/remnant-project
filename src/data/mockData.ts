export interface Marker {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance?: string;
  summary: string;
  story: string;
  sources: string[];
  image: string;
  visited: boolean;
  category: string;
}

export const markers: Marker[] = [
  {
    id: "union-station",
    name: "Union Station",
    address: "1717 Pacific Ave, Tacoma",
    lat: 47.2529,
    lng: -122.4443,
    distance: "0.3 miles",
    summary: "Built in 1911 by the Northern Pacific Railway, Union Station was designed by Reed and Stem, the architects of New York City's Grand Central Terminal. Its magnificent copper dome and rotunda remain a testament to the city's railroad heritage.",
    story: "Built in 1911 by the Northern Pacific Railway, Union Station was designed by Reed and Stem, the architects of New York City's Grand Central Terminal. Its magnificent copper dome and rotunda remain a testament to the city's railroad heritage. The station served as a major rail hub connecting Tacoma to the rest of the Pacific Northwest and beyond.",
    sources: ["Tacoma Historical Society", "National Register of Historic Places", "Metro Parks Tacoma Archives"],
    image: "union-station",
    visited: true,
    category: "Architecture",
  },
  {
    id: "wa-history-museum",
    name: "Washington State History Museum",
    address: "1911 Pacific Ave, Tacoma",
    lat: 47.2535,
    lng: -122.4439,
    distance: "0.2 miles",
    summary: "Washington State History Museum is a museum in downtown Tacoma dedicated to the history of Washington state. It features interactive exhibits and a large collection of artifacts.",
    story: "The Washington State History Museum opened in 1996 as part of the revitalization of Tacoma's downtown corridor. The museum houses over 50,000 artifacts and documents chronicling the history of Washington state from prehistoric times to the present.",
    sources: ["Washington State Historical Society", "Tacoma Public Library Archives"],
    image: "history-museum",
    visited: false,
    category: "Museums",
  },
  {
    id: "stadium-high",
    name: "Stadium High School",
    address: "111 N E St, Tacoma",
    lat: 47.2621,
    lng: -122.4497,
    distance: "0.8 miles",
    summary: "Originally built as a luxury hotel in 1891, Stadium High School is a French chateau-style building that became a high school in 1906 after a fire damaged the original structure.",
    story: "Stadium High School has one of the most unusual origin stories of any school in America. Originally designed as a luxury hotel by Hewitt & Hewitt architects, the building was meant to rival the finest hotels on the East Coast. After the Panic of 1893 halted construction, a fire in 1898 damaged the unfinished building.",
    sources: ["Tacoma Landmarks Preservation Commission", "Stadium High School Archives"],
    image: "union-station",
    visited: false,
    category: "Architecture",
  },
  {
    id: "chinese-reconciliation",
    name: "Chinese Reconciliation Park",
    address: "1741 Schuster Pkwy, Tacoma",
    lat: 47.2659,
    lng: -122.4571,
    distance: "1.2 miles",
    summary: "A park dedicated to acknowledging and reconciling Tacoma's 1885 expulsion of its Chinese residents, one of many such incidents across the American West.",
    story: "In November 1885, a mob of residents forcibly expelled Tacoma's entire Chinese community of about 200 people. The Chinese Reconciliation Park was established to acknowledge this dark chapter in the city's history and to promote healing and understanding.",
    sources: ["Tacoma Chinese Reconciliation Project Foundation", "Northwest Asian Weekly"],
    image: "history-museum",
    visited: true,
    category: "Memorials",
  },
  {
    id: "totem-pole",
    name: "Fireman's Park Totem Pole",
    address: "Fireman's Park, Tacoma",
    lat: 47.2545,
    lng: -122.4410,
    distance: "0.5 miles",
    summary: "A historic totem pole standing in Fireman's Park, representing the region's deep ties to Native American art and culture.",
    story: "The totem pole in Fireman's Park has stood as a symbol of the Pacific Northwest's indigenous heritage for decades. It serves as a reminder of the Puyallup people who have called this region home for thousands of years.",
    sources: ["Puyallup Tribal Museum", "Tacoma Arts Commission"],
    image: "union-station",
    visited: false,
    category: "Indigenous",
  },
  {
    id: "old-city-hall",
    name: "Old City Hall",
    address: "625 Commerce St, Tacoma",
    lat: 47.2531,
    lng: -122.4367,
    distance: "0.6 miles",
    summary: "Tacoma's Old City Hall, built in 1893, is an Italian Renaissance Revival building that served as the seat of city government until 1959.",
    story: "The Old City Hall building stands as one of Tacoma's most recognized landmarks. Designed by Hatherton & McIntosh, it was built during Tacoma's boom years when the city rivaled Seattle as the major metropolis of the Pacific Northwest.",
    sources: ["Tacoma Historical Society", "City of Tacoma Archives"],
    image: "history-museum",
    visited: false,
    category: "Architecture",
  },
];

export const categories = ["All", "Architecture", "Museums", "Memorials", "Indigenous"];
