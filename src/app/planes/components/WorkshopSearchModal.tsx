'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, X, Loader2, Navigation, Phone, Wrench, Clock, Car } from 'lucide-react';
import { PublicWorkshop, getPublicWorkshops } from '@/actions/public-workshops';
import Link from 'next/link';
import { Map, MapMarker, MarkerContent, MarkerTooltip, MapControls, MapRoute, MapPopup } from '@/components/ui/mapcn-map-route';

interface WorkshopSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to assign a random color based on workshop ID
function getWorkshopStyle(id: string) {
  const colors = [
    { accent: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { accent: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    { accent: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { accent: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { accent: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  ];
  
  // Use sum of char codes to pick a color
  const charSum = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[charSum % colors.length];
}

// Haversine formula to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

interface RouteData {
  geometry: { coordinates: [number, number][] };
  duration: number; // in seconds
  distance: number; // in meters
}

export function WorkshopSearchModal({ isOpen, onClose }: WorkshopSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [workshops, setWorkshops] = useState<PublicWorkshop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Focus trap and esc handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Solicitar ubicación al abrir el modal
  useEffect(() => {
    if (isOpen && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Error obteniendo la ubicación:', error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [isOpen]);

  // Debounced Search
  useEffect(() => {
    if (!isOpen) return;

    const fetchWorkshops = async () => {
      setIsLoading(true);
      try {
        const results = await getPublicWorkshops(searchQuery);
        setWorkshops(results);
      } catch (error) {
        console.error('Failed to search workshops:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchWorkshops();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  // Generate coordinates & calculate travel times
  const workshopsWithMeta = useMemo(() => {
    return workshops.map(workshop => {
      // Generate deterministic pseudo-random coordinates around Bogota based on ID as fallback
      const charSum = workshop.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const baseLng = -74.0721;
      const baseLat = 4.7110;
      
      const latOffset = ((charSum % 100) - 50) * 0.002;
      const lngOffset = (((charSum * 3) % 100) - 50) * 0.002;
      
      let lat = baseLat + latOffset;
      let lng = baseLng + lngOffset;

      // If the workshop has a real location saved from the dashboard
      if (workshop.maps_link && workshop.maps_link.includes('q=')) {
        const qParam = workshop.maps_link.split('q=')[1];
        if (qParam) {
          const [parsedLat, parsedLng] = qParam.split(',').map(Number);
          if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            lat = parsedLat;
            lng = parsedLng;
          }
        }
      }

      let distance = 0;
      let travelTimeMinutes = 0;

      if (userLocation) {
        distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
        // Estimar tiempo de viaje base (se sobreescribirá con la ruta real si se selecciona)
        travelTimeMinutes = Math.round(distance * 2);
      }

      return {
        ...workshop,
        lat,
        lng,
        distance,
        travelTimeMinutes,
      };
    });
  }, [workshops, userLocation]);

  // Sort by closest if user location is known
  const sortedWorkshops = useMemo(() => {
    if (!userLocation) return workshopsWithMeta;
    return [...workshopsWithMeta].sort((a, b) => a.distance - b.distance);
  }, [workshopsWithMeta, userLocation]);

  const selectedWorkshop = useMemo(() => {
    return sortedWorkshops.find(w => w.id === selectedWorkshopId);
  }, [sortedWorkshops, selectedWorkshopId]);

  // Fetch route from OSRM
  useEffect(() => {
    if (!userLocation || !selectedWorkshop) {
      setRoutes([]);
      return;
    }

    const fetchRoute = async () => {
      setIsLoadingRoute(true);
      try {
        const coords = `${userLocation.lng},${userLocation.lat};${selectedWorkshop.lng},${selectedWorkshop.lat}`;
        // Fetch from public OSRM driving profile
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=true`);
        const data = await res.json();
        
        if (data.code === 'Ok' && data.routes) {
          setRoutes(data.routes.map((r: any) => ({
            geometry: r.geometry,
            duration: r.duration,
            distance: r.distance
          })));
        } else {
          setRoutes([]);
        }
      } catch (error) {
        console.error("Failed to fetch route:", error);
        setRoutes([]);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [selectedWorkshop, userLocation]);

  // Determine initial map viewport
  const mapViewport = useMemo(() => {
    if (userLocation) {
      return { center: [userLocation.lng, userLocation.lat] as [number, number], zoom: 12.5 };
    }
    return { center: [-74.0721, 4.7110] as [number, number], zoom: 11 };
  }, [userLocation]);

  const primaryRoute = routes[0];
  const altRoutes = routes.slice(1);

  const getMiddleCoord = (coords: [number, number][]) => {
    if (!coords || coords.length === 0) return null;
    return coords[Math.floor(coords.length / 2)];
  };

  const formatDuration = (seconds: number) => {
    const min = Math.round(seconds / 60);
    if (min > 60) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      return `${h} h ${m} min`;
    }
    return `${min} min`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-6 bg-background/80 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl h-[100dvh] sm:h-[90vh] bg-card border-none sm:border border-border shadow-2xl rounded-none sm:rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header & Search Input */}
        <div className="p-4 sm:p-6 border-b border-border bg-card/50 backdrop-blur-md shrink-0 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
              Explorar talleres cercanos
            </h2>
            <button 
              onClick={onClose}
              className="p-2 -mr-2 -mt-2 rounded-full hover:bg-muted text-muted-foreground transition-colors shrink-0"
              aria-label="Cerrar ventana"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Ingresa tu ciudad, dirección o nombre del taller..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-12 pr-12 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-lg shadow-sm"
            />
            {isLoading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-hidden p-4 sm:p-6 bg-muted/10">
          {sortedWorkshops.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <Wrench className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">No encontramos talleres con esos criterios.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Intenta buscar por el nombre de tu ciudad.</p>
            </div>
          ) : (
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 h-full">
              {/* List */}
              <div className="flex-1 grid gap-4 sm:grid-cols-1 auto-rows-max overflow-y-auto pr-2 pb-4 order-2 lg:order-1">
                {sortedWorkshops.map((workshop) => {
                  const style = getWorkshopStyle(workshop.id);
                  const isSelected = selectedWorkshopId === workshop.id;
                  
                  // Use real route time if this is the selected workshop and route is loaded
                  const displayTime = isSelected && primaryRoute 
                    ? formatDuration(primaryRoute.duration) 
                    : `${workshop.travelTimeMinutes} min`;
                    
                  const displayDistance = isSelected && primaryRoute 
                    ? (primaryRoute.distance / 1000).toFixed(1) 
                    : workshop.distance.toFixed(1);

                  return (
                    <div 
                      key={workshop.id} 
                      onClick={() => setSelectedWorkshopId(workshop.id)}
                      className={`p-5 rounded-xl border bg-card/80 backdrop-blur-sm transition-all hover:shadow-lg cursor-pointer ${isSelected ? 'ring-2 ring-primary border-primary' : style.border} flex flex-col h-full`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className={`text-xl font-bold mb-1 ${style.accent}`}>{workshop.name}</h3>
                          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>
                              {workshop.city || 'Ciudad no especificada'}{workshop.address ? `, ${workshop.address}` : ''}
                            </span>
                          </div>
                          {userLocation && (
                            <div className={`flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-md border text-sm font-medium w-max ${isSelected ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-background border-border text-foreground'}`}>
                              {isLoadingRoute && isSelected ? (
                                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                              ) : (
                                <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                              )}
                              Llegas en {displayTime} <span className="opacity-70 font-normal text-xs ml-1">({displayDistance} km)</span>
                            </div>
                          )}
                        </div>
                        <div className={`p-2 rounded-lg ${style.bg}`}>
                          <Wrench className={`w-5 h-5 ${style.accent}`} />
                        </div>
                      </div>

                      <div className="mt-auto pt-4 flex gap-2">
                        {workshop.phone ? (
                          <Link href={`https://wa.me/${workshop.phone.replace(/\D/g, '')}`} target="_blank" className="flex-1" onClick={(e) => e.stopPropagation()}>
                            <button className="w-full py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                              <Phone className="w-4 h-4" />
                              Contactar
                            </button>
                          </Link>
                        ) : (
                          <button disabled className="flex-1 py-2 px-3 rounded-lg bg-muted text-muted-foreground border border-border flex items-center justify-center gap-2 text-sm font-medium opacity-50 cursor-not-allowed">
                            <Phone className="w-4 h-4" />
                            Sin número
                          </button>
                        )}
                        
                        <Link 
                          href={workshop.maps_link || `https://maps.google.com/?q=${encodeURIComponent(`${workshop.name}, ${workshop.address || ''}, ${workshop.city || ''}`)}`} 
                          target="_blank" 
                          className="flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button className="w-full py-2 px-3 rounded-lg bg-background hover:bg-muted text-foreground border border-border transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                            <Navigation className="w-4 h-4" />
                            Ubicación
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Map */}
              <div className="min-h-[250px] lg:min-h-0 relative rounded-xl border border-border overflow-hidden bg-card/50 order-1 lg:order-2 shrink-0">
                <Map 
                  viewport={mapViewport}
                  className="w-full h-full absolute inset-0"
                  theme="dark"
                >
                  <MapControls 
                    position="bottom-right" 
                    showLocate 
                    onLocate={(coords) => setUserLocation({lat: coords.latitude, lng: coords.longitude})} 
                  />

                  {/* Alternative Routes */}
                  {userLocation && selectedWorkshop && altRoutes.map((route, i) => {
                    const midCoord = getMiddleCoord(route.geometry.coordinates);
                    return (
                      <div key={`alt-route-${i}`}>
                        <MapRoute
                          coordinates={route.geometry.coordinates}
                          color="#f97316" // orange-500
                          width={4}
                          opacity={0.5}
                        />
                        {midCoord && (
                          <MapPopup longitude={midCoord[0]} latitude={midCoord[1]} closeButton={false} offset={0} className="p-0 border-none bg-transparent shadow-none">
                            <div className="bg-orange-500/20 backdrop-blur-md text-orange-100 px-2 py-1 rounded-lg shadow-[0_4px_30px_rgba(249,115,22,0.1)] text-xs font-medium border border-orange-500/30 flex items-center gap-1 opacity-90 hover:opacity-100 transition-opacity">
                              <Car className="w-3 h-3" />
                              {formatDuration(route.duration)}
                            </div>
                          </MapPopup>
                        )}
                      </div>
                    );
                  })}

                  {/* Primary Route */}
                  {userLocation && selectedWorkshop && primaryRoute && (
                    <>
                      <MapRoute
                        coordinates={primaryRoute.geometry.coordinates}
                        color="#3b82f6" // blue-500
                        width={6}
                      />
                      {getMiddleCoord(primaryRoute.geometry.coordinates) && (
                        <MapPopup longitude={getMiddleCoord(primaryRoute.geometry.coordinates)![0]} latitude={getMiddleCoord(primaryRoute.geometry.coordinates)![1]} closeButton={false} offset={0} className="p-0 border-none bg-transparent shadow-none z-10">
                          <div className="bg-background text-foreground px-2.5 py-1.5 rounded-lg shadow-xl text-sm font-bold border border-border flex items-center gap-1.5 ring-2 ring-primary/20">
                            <Car className="w-4 h-4 text-primary" />
                            <span className="text-primary">{formatDuration(primaryRoute.duration)}</span>
                            <div className="flex flex-col ml-1">
                              <span className="text-[10px] text-muted-foreground font-normal leading-none mb-0.5">{(primaryRoute.distance / 1000).toFixed(1)} km</span>
                            </div>
                          </div>
                        </MapPopup>
                      )}
                    </>
                  )}

                  {/* Fallback straight line if no route loaded yet */}
                  {userLocation && selectedWorkshop && !primaryRoute && !isLoadingRoute && (
                    <MapRoute
                      coordinates={[
                        [userLocation.lng, userLocation.lat],
                        [selectedWorkshop.lng, selectedWorkshop.lat]
                      ]}
                      color="#3b82f6"
                      width={4}
                      dashArray={[2, 2]}
                    />
                  )}

                  {/* User Location Marker */}
                  {userLocation && (
                    <MapMarker longitude={userLocation.lng} latitude={userLocation.lat}>
                      <MarkerContent>
                        <div className="relative flex items-center justify-center">
                          <div className="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping" />
                          <div className="relative w-4 h-4 rounded-full border-2 border-white bg-blue-500 shadow-xl" />
                        </div>
                      </MarkerContent>
                      <MarkerTooltip className="px-3 py-2 bg-background border border-border text-foreground font-semibold shadow-xl">
                        Estás aquí
                      </MarkerTooltip>
                    </MapMarker>
                  )}

                  {sortedWorkshops.map((workshop) => {
                    const style = getWorkshopStyle(workshop.id);
                    
                    // Parse text colors from style.accent to tailwind bg colors
                    const getMarkerBgColor = (accentClass: string) => {
                      if (accentClass.includes('blue')) return 'bg-blue-500';
                      if (accentClass.includes('orange')) return 'bg-orange-500';
                      if (accentClass.includes('emerald')) return 'bg-emerald-500';
                      if (accentClass.includes('purple')) return 'bg-purple-500';
                      if (accentClass.includes('rose')) return 'bg-rose-500';
                      return 'bg-primary';
                    };

                    const markerBg = getMarkerBgColor(style.accent);
                    const isSelected = selectedWorkshopId === workshop.id;

                    return (
                      <MapMarker 
                        key={`marker-${workshop.id}`}
                        longitude={workshop.lng} 
                        latitude={workshop.lat}
                      >
                        <MarkerContent className="group">
                          <div onClick={() => setSelectedWorkshopId(workshop.id)} className={`relative ${isSelected ? 'h-8 w-8 ring-4 ring-primary ring-offset-2 ring-offset-background' : 'h-6 w-6'} rounded-full border-2 border-white ${markerBg} shadow-lg flex items-center justify-center transition-all hover:scale-110 cursor-pointer`}>
                            <Wrench className={`${isSelected ? 'w-4 h-4' : 'w-3 h-3'} text-white`} />
                          </div>
                        </MarkerContent>
                        <MarkerTooltip className="px-3 py-2 bg-background border border-border text-foreground font-semibold shadow-xl">
                          {workshop.name}
                        </MarkerTooltip>
                      </MapMarker>
                    );
                  })}
                </Map>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
