export interface Species {
  id: string;
  commonName: string;
  scientificName: string;
  category: 'mammal' | 'bird' | 'reptile';
}

export const SPECIES_LIST: Species[] = [
  // Large Predators
  { id: 'lion', commonName: 'Lion', scientificName: 'Panthera leo', category: 'mammal' },
  { id: 'leopard', commonName: 'Leopard', scientificName: 'Panthera pardus', category: 'mammal' },
  { id: 'cheetah', commonName: 'Cheetah', scientificName: 'Acinonyx jubatus', category: 'mammal' },
  { id: 'brown-hyena', commonName: 'Brown Hyena', scientificName: 'Parahyaena brunnea', category: 'mammal' },
  { id: 'spotted-hyena', commonName: 'Spotted Hyena', scientificName: 'Crocuta crocuta', category: 'mammal' },
  { id: 'african-wild-dog', commonName: 'African Wild Dog', scientificName: 'Lycaon pictus', category: 'mammal' },
  
  // Medium Predators
  { id: 'black-backed-jackal', commonName: 'Black-backed Jackal', scientificName: 'Lupulella mesomelas', category: 'mammal' },
  { id: 'cape-fox', commonName: 'Cape Fox', scientificName: 'Vulpes chama', category: 'mammal' },
  { id: 'bat-eared-fox', commonName: 'Bat-eared Fox', scientificName: 'Otocyon megalotis', category: 'mammal' },
  { id: 'african-wildcat', commonName: 'African Wildcat', scientificName: 'Felis lybica', category: 'mammal' },
  { id: 'caracal', commonName: 'Caracal', scientificName: 'Caracal caracal', category: 'mammal' },
  { id: 'aardwolf', commonName: 'Aardwolf', scientificName: 'Proteles cristata', category: 'mammal' },
  { id: 'honey-badger', commonName: 'Honey Badger', scientificName: 'Mellivora capensis', category: 'mammal' },
  
  // Large Herbivores
  { id: 'gemsbok', commonName: 'Gemsbok', scientificName: 'Oryx gazella', category: 'mammal' },
  { id: 'eland', commonName: 'Eland', scientificName: 'Taurotragus oryx', category: 'mammal' },
  { id: 'blue-wildebeest', commonName: 'Blue Wildebeest', scientificName: 'Connochaetes taurinus', category: 'mammal' },
  { id: 'red-hartebeest', commonName: 'Red Hartebeest', scientificName: 'Alcelaphus buselaphus', category: 'mammal' },
  { id: 'giraffe', commonName: 'Giraffe', scientificName: 'Giraffa camelopardalis', category: 'mammal' },
  { id: 'greater-kudu', commonName: 'Greater Kudu', scientificName: 'Tragelaphus strepsiceros', category: 'mammal' },
  
  // Medium Herbivores
  { id: 'springbok', commonName: 'Springbok', scientificName: 'Antidorcas marsupialis', category: 'mammal' },
  { id: 'steenbok', commonName: 'Steenbok', scientificName: 'Raphicerus campestris', category: 'mammal' },
  { id: 'duiker', commonName: 'Common Duiker', scientificName: 'Sylvicapra grimmia', category: 'mammal' },
  { id: 'warthog', commonName: 'Warthog', scientificName: 'Phacochoerus africanus', category: 'mammal' },
  
  // Small Mammals
  { id: 'aardvark', commonName: 'Aardvark', scientificName: 'Orycteropus afer', category: 'mammal' },
  { id: 'porcupine', commonName: 'Cape Porcupine', scientificName: 'Hystrix africaeaustralis', category: 'mammal' },
  { id: 'springhare', commonName: 'Springhare', scientificName: 'Pedetes capensis', category: 'mammal' },
  { id: 'ground-squirrel', commonName: 'Cape Ground Squirrel', scientificName: 'Geosciurus inauris', category: 'mammal' },
  { id: 'suricate', commonName: 'Meerkat', scientificName: 'Suricata suricatta', category: 'mammal' },
  { id: 'yellow-mongoose', commonName: 'Yellow Mongoose', scientificName: 'Cynictis penicillata', category: 'mammal' },
  { id: 'slender-mongoose', commonName: 'Slender Mongoose', scientificName: 'Herpestes sanguineus', category: 'mammal' },
  
  // Birds
  { id: 'ostrich', commonName: 'Ostrich', scientificName: 'Struthio camelus', category: 'bird' },
  { id: 'secretarybird', commonName: 'Secretarybird', scientificName: 'Sagittarius serpentarius', category: 'bird' },
  { id: 'kori-bustard', commonName: 'Kori Bustard', scientificName: 'Ardeotis kori', category: 'bird' },
  { id: 'martial-eagle', commonName: 'Martial Eagle', scientificName: 'Polemaetus bellicosus', category: 'bird' },
  { id: 'lappet-faced-vulture', commonName: 'Lappet-faced Vulture', scientificName: 'Torgos tracheliotos', category: 'bird' },
  { id: 'southern-pale-chanting-goshawk', commonName: 'Southern Pale Chanting Goshawk', scientificName: 'Melierax canorus', category: 'bird' },
  
  // Reptiles
  { id: 'leopard-tortoise', commonName: 'Leopard Tortoise', scientificName: 'Stigmochelys pardalis', category: 'reptile' },
  { id: 'rock-monitor', commonName: 'Rock Monitor', scientificName: 'Varanus albigularis', category: 'reptile' },
  { id: 'puff-adder', commonName: 'Puff Adder', scientificName: 'Bitis arietans', category: 'reptile' },
  { id: 'cape-cobra', commonName: 'Cape Cobra', scientificName: 'Naja nivea', category: 'reptile' },
];

export interface CameraStation {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

export const CAMERA_STATIONS: CameraStation[] = [
  { id: 'gate-waterhole', name: 'Gate Waterhole' },
  { id: 'modisa-pan', name: 'Modisa Pan' },
  { id: 'sirgas-waterhole', name: 'Sirgas Waterhole' },
  { id: 'dune-waterhole', name: 'Dune Waterhole' },
];
