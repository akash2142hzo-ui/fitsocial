// Static bundled assets; never fetch photography over the network.
export const photography = {
  home: require("../../assets/photos/home-gym-hero.jpg"),
  strength: require("../../assets/photos/strength-equipment.jpg"),
  cardio: require("../../assets/photos/cardio-equipment.jpg"),
} as const;
