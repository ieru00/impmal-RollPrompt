import { capitalizeFirstLetter, getActorOwners } from './rp_utils.js';

export const sendChatMessage = (
  actor,
  skill,
  difficultyValue,
  difficultyName,
  successLevel,
  isPrivate
) => {
  const img = actor.img;
  const actorName = actor.name;
  const skillName = capitalizeFirstLetter(skill);
  const difficultyText = `${capitalizeFirstLetter(difficultyName)}`;
  const owners = getActorOwners(actor);
  const uniqueWhisper = [...new Set([game.user.id, ...owners])];

  const messageContent = `
    <div class="chat-card">
      <header class="card-header">
        <img src="${img}" title="${actorName}" width="50" height="50"/>
        <h3>${actorName}</h3>
      </header>
      <div class="card-content">
        <p>Skill: ${skillName}</p>
        <p>Difficulty: ${difficultyText}</p>
        <p>Success Level: ${successLevel}</p>
        <button class="roll-button" data-skill="${skill}" data-actor="${actor.id}" 
          data-difficulty="${difficultyValue}" data-difficulty-name="${difficultyName}" 
          data-success-level="${successLevel}" data-private="${isPrivate}" 
          data-owners="${owners.join(",")}" data-gms="${game.users
            .filter((user) => user.isGM)
            .map((user) => user.id)
            .join(",")}" style="margin-top: 3px;">Roll: ${skillName}</button>
      </div>
    </div>`;

  const chatData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    content: messageContent,
    whisper: isPrivate ? uniqueWhisper : [],
  };

  ChatMessage.create(chatData);
};