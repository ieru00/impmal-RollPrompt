export const capitalizeFirstLetter = (string) =>
    string.charAt(0).toUpperCase() + string.slice(1);
  
  export const getActorOwners = (actor) => {
    const owners = Object.keys(actor.ownership).filter(
      (userId) => actor.ownership[userId] === 3
    );
    const gms = game.users.filter((user) => user.isGM).map((user) => user.id);
    return [...owners, ...gms];
  };