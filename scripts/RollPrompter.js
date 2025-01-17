console.log('DIALOG VALIDATION | TGMKOLL I SEE YOU THERE!');

// Function to capitalize the first letter of each word
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Define difficulty levels
const difficulties = [
  { name: "Challenging", value: 0, special_name: "challenging"},
  { name: "Routine", value: 20, special_name: "routine" },
  { name: "Easy", value: 40, special_name: "easy"},
  { name: "Very Easy", value: 60, special_name: "veryEasy" },
  { name: "Difficult", value: -10, special_name: "difficult" },
  { name: "Hard", value: -20, special_name: "hard" },
  { name: "Very Hard", value: -30, special_name: "veryHard" }
];

// Function to create and show the skill selection dialog
function createSkillSelectionDialog(actor) {
  let skills = actor.system.skills;

  let combinedSkillsArray = []; // Initialize an empty array to store skills and specializations
  let actorName = actor.name; // Get the actor's name
  let actorImage = actor.img; // Get the actor's image path

  // Iterate through each skill
  for (let skill in skills) {
    combinedSkillsArray.push({ name: skill }); // Add the main skill to the array

    // Check for specializations and treat them as skills
    if (skills[skill].specialisations) {
      skills[skill].specialisations.forEach(spec => {
        combinedSkillsArray.push({
          name: `${skill}: ${capitalizeFirstLetter(spec.name)}`, // Include parent skill in the name and capitalize
          id: spec.id,
          parentSkill: skill // Optional: to track the parent skill if needed
        });
      });
    }
  }

  console.log(combinedSkillsArray); // Output the array to the console for debugging

  // Generate options for skill dropdown
  let skillOptions = `<option value=""></option>` + combinedSkillsArray.map(skill => `<option value="${skill.name}">${capitalizeFirstLetter(skill.name)}</option>`).join("");

  // Generate options for difficulty dropdown with display text and values
  let difficultyOptions = difficulties.map(diff => `<option value="${diff.value}">${diff.name} ${diff.value > 0 ? `+${diff.value}` : `${diff.value}`}</option>`).join("");

  // Create a dialog for this token with both dropdowns and checkbox
  new Dialog({
    title: `Select Skill for ${actorName}`,
    content: `
      <form>
        <div class="form-group" style="text-align: center; width: 80px; height: 80px; margin: 0 auto;">
          <img src="${actorImage}" alt="${actorName}" style="width:100%; height:100%; object-fit:cover; display: block;">
        </div>
        <div class="form-group">
          <label for="Skill">Skill Select</label>
          <div class="form-fields">
            <select name="Skill">
              ${skillOptions}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="Difficulty">Difficulty Select</label>
          <div class="form-fields">
            <select name="Difficulty">
              ${difficultyOptions}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="Private">Private?</label>
          <input type="checkbox" name="Private" />
        </div>
        <div class="form-group">
      </form>
    `,
    buttons: {
      confirm: {
        label: "Confirm",
        callback: async (html) => { 
          let selectedSkill = html.find('[name="Skill"]').val();
          let selectedDifficultyValue = html.find('[name="Difficulty"]').val();
          let isPrivate = html.find('[name="Private"]').is(':checked');

          let selectedDifficulty = difficulties.find(diff => diff.value == selectedDifficultyValue).name;
          let selectedSpecialName = difficulties.find(diff => diff.value == selectedDifficultyValue).special_name;
          
          let selectedSkillObj = combinedSkillsArray.find(skill => skill.name === selectedSkill);
          let skillSetup = {
              itemId: selectedSkillObj?.id || undefined,
              name: undefined,
              key: selectedSkillObj?.parentSkill || selectedSkill
          };

          // Create the optionSetup object with the special name
          let optionSetup = {
            title: {},
            fields: {
              difficulty: selectedSpecialName
            }
          };
          console.log(optionSetup); // Output the optionSetup object for debugging

          // Determine the content of the chat message
          const content = `
            <div style="display: flex; align-items: center;">
              <img src="${actorImage}" alt="${actorName}" style="width:60px; height:60px; object-fit:cover; margin-right:10px;">
              <div>
                <strong>${actorName}</strong><br>
                Skill: <strong>${capitalizeFirstLetter(selectedSkill)}</strong><br>
                Difficulty: <strong>${selectedDifficulty} ${selectedDifficultyValue >= 0 ? `+${selectedDifficultyValue}` : selectedDifficultyValue}</strong><br>
                <button class="roll-skill-test" data-actor-id="${actor.id}" data-skill-key="${skillSetup.key}" data-skill-id="${skillSetup.itemId}" data-difficulty="${selectedDifficultyValue}" data-private="${isPrivate}">Roll Skill: ${capitalizeFirstLetter(selectedSkill)}</button>
              </div>
            </div>
          `;

          // Send the chat message
          if (isPrivate) {
            // Send a whispered message to the actor's owner
            const owner = game.users.players.find(u => u.character === actor.id || actor.ownership[u.id] === 3);
            if (owner) {
              await ChatMessage.create({
                user: game.user.id,
                speaker: ChatMessage.getSpeaker({ actor }),
                content: content,
                whisper: [owner.id]
              });
            }
          } else {
            // Send a regular chat message
            await ChatMessage.create({
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({ actor }),
              content: content
            });
          }
        }
      },
      cancel: {
        label: "Cancel",
        callback: () => { ui.notifications.info("Roll Prompt Cancelled!"); }
      }
    },
    default: "confirm"
  }).render(true);
}

// Add custom button to the UI
Hooks.on('renderSceneControls', (controls, html) => {
  // Check if the current user is the GM
  if (!game.user.isGM) return;

  // Create the button
  const button = $(`<li class="control-tool" title="Send Skill Test Message">
    <i class="fas fa-dice"></i>
  </li>`);
  
  // Add click event to the button
  button.click(() => {
    // Ensure at least one token is explicitly selected
    if (canvas.tokens.controlled.length === 0) {
      ui.notifications.warn("No token selected. Please select a token to proceed.");
      return;
    }

    // Loop through each selected token and create a dialog for each actor
    for (let token of canvas.tokens.controlled) {
      let actor = token.actor;

      if (!actor) {
        ui.notifications.warn("Selected token does not have an actor.");
        continue;
      }

      createSkillSelectionDialog(actor); // Call the skill selection dialog for each actor
    }
  });

  // Append the button to the Scene Controls
  html.find('.main-controls').append(button);
});

// Event listener for the chat message click
Hooks.on('renderChatMessage', (message, html, data) => {
  html.find('.roll-skill-test').click(async (ev) => {
    ev.preventDefault(); // Prevent any default action, just in case
    const actorId = ev.currentTarget.dataset.actorId;
    const skillKey = ev.currentTarget.dataset.skillKey;
    const skillId = ev.currentTarget.dataset.skillId;
    const difficulty = ev.currentTarget.dataset.difficulty;
    const isPrivate = ev.currentTarget.dataset.private === 'true';
    const actor = game.actors.get(actorId);

    console.log(actor); // Check if the actor is correctly fetched
    if (actor) {
      // Create the skill setup object
      let skillSetup = {
        itemId: skillId || undefined,
        name: undefined,
        key: skillKey
      };

      // Create the optionSetup object with the special name
      let optionSetup = {
        title: {},
        fields: {
          difficulty: difficulties.find(diff => diff.value == difficulty).special_name
        }
      };

      // Perform the skill test with the selected skill, difficulty, and privacy setting
      if (actor.isOwner || game.user.isGM) {
        await actor.setupSkillTest(skillSetup, optionSetup, true);
      } else {
        ui.notifications.warn("You do not have permission to perform this action.");
      }
    } else {
      console.error(`Actor with ID ${actorId} not found.`);
    }
  });
});
