const difficulties = [
  { name: "Challenging", value: 0, special_name: "challenging" },
  { name: "Routine", value: 20, special_name: "routine" },
  { name: "Easy", value: 40, special_name: "easy" },
  { name: "Very Easy", value: 60, special_name: "veryEasy" },
  { name: "Difficult", value: -10, special_name: "difficult" },
  { name: "Hard", value: -20, special_name: "hard" },
  { name: "Very Hard", value: -30, special_name: "veryHard" }
];

const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1);

function createSkillSelectionDialog(actor) {
  const skills = actor.system.skills;
  const combinedSkillsArray = [];
  const actorName = actor.name;
  const actorImage = actor.img;

  for (const skill in skills) {
    combinedSkillsArray.push({ name: skill });

    if (skills[skill].specialisations) {
      skills[skill].specialisations.forEach(spec => {
        combinedSkillsArray.push({
          name: `${skill}: ${capitalizeFirstLetter(spec.name)}`,
          id: spec.id,
          parentSkill: skill
        });
      });
    }
  }

  const skillOptions = `<option value=""></option>` + combinedSkillsArray.map(skill => `<option value="${skill.name}">${capitalizeFirstLetter(skill.name)}</option>`).join("");
  const difficultyOptions = difficulties.map(diff => `<option value="${diff.value}">${diff.name} ${diff.value > 0 ? `+${diff.value}` : `${diff.value}`}</option>`).join("");

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
            <select name="Skill" id="skill-select">
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
          <label for="SL">Success Level (SL)</label>
          <input type="number" name="SL" value="0" step="1" min="-10" max="10" style="width: 60px; padding: 2px; text-align: center;" />
        </div>
        <div class="form-group">
          <label for="Private">Private?</label>
          <input type="checkbox" name="Private" />
        </div>
      </form>
      <style>
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: auto;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      </style>
    `,
    buttons: {
      confirm: {
        label: "Confirm",
        callback: async (html) => { 
          const selectedSkill = html.find('[name="Skill"]').val();
          const selectedDifficultyValue = html.find('[name="Difficulty"]').val();
          const successLevel = html.find('[name="SL"]').val();
          const isPrivate = html.find('[name="Private"]').is(':checked');

          const selectedDifficulty = difficulties.find(diff => diff.value == selectedDifficultyValue)?.name || "Unknown";
          const selectedSpecialName = difficulties.find(diff => diff.value == selectedDifficultyValue)?.special_name || "unknown";
          const selectedSkillObj = combinedSkillsArray.find(skill => skill.name === selectedSkill);
          
          const skillSetup = {
            itemId: selectedSkillObj?.id || undefined,
            name: undefined,
            key: selectedSkillObj?.parentSkill || selectedSkill
          };

          const optionSetup = {
            title: {},
            fields: {
              difficulty: selectedSpecialName,
              successLevel: successLevel
            },
            rollMode: isPrivate ? "gmroll" : "publicroll"
          };

          const content = `
            <div style="display: flex; align-items: center;">
              <img src="${actorImage}" alt="${actorName}" style="width:60px; height:60px; object-fit:cover; margin-right:10px;">
              <div>
                <strong>${actorName}</strong><br>
                Skill: <strong>${capitalizeFirstLetter(selectedSkill)}</strong><br>
                Difficulty: <strong>${selectedDifficulty} ${selectedDifficultyValue >= 0 ? `+${selectedDifficultyValue}` : selectedDifficultyValue}</strong><br>
                SL: <strong>${successLevel}</strong><br>
                <button class="roll-skill-test" data-actor-id="${actor.id}" data-skill-key="${skillSetup.key}" data-skill-id="${skillSetup.itemId}" data-difficulty="${selectedDifficultyValue}" data-private="${isPrivate}" data-success-level="${successLevel}">Roll Skill: ${capitalizeFirstLetter(selectedSkill)}</button>
              </div>
            </div>
          `;

          if (isPrivate) {
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
            await ChatMessage.create({
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({ actor }),
              content: content
            });
          }

          ui.notifications.info("Skill test initiated!");
        },
        disabled: true // Initially disabled
      },
      cancel: {
        label: "Cancel",
        callback: () => { ui.notifications.info("Cancelled!"); }
      }
    },
    default: "confirm",
    render: (html) => {
      html.find('[name="Skill"]').change(() => {
        const skillSelected = html.find('[name="Skill"]').val() !== "";
        html.find('button[data-button="confirm"]').prop("disabled", !skillSelected);
      });
    }
  }).render(true);
}

// Start Prompt Dialog

Hooks.on('renderSceneControls', (controls, html) => {
  if (!game.user.isGM) return;

  const button = $(`<li class="control-tool" title="Open Custom Dialog">
    <i class="fas fa-dice"></i>
  </li>`);

  let showAllActors = localStorage.getItem('showAllActors') === 'true';
  let dialogInstance = null;

  const createDialogContent = (showAllActors) => {
    const playerActors = canvas.tokens.placeables.filter(token => token.actor && token.actor.hasPlayerOwner);
    let dialogContent = `
      <div style="display: flex; justify-content: flex-start; align-items: center; margin-bottom: 10px;">
        <button id="toggleButton" style="padding: 5px 10px; margin-right: 10px;">${showAllActors ? "Roll for All" : "Show Tokens"}</button>
      </div>
      <form style="display: flex; flex-wrap: wrap; overflow-x: auto; max-width: 100%;">`;

    if (showAllActors) {
      for (const token of playerActors) {
        const actor = token.actor;
        const tokenImg = actor.img;
        dialogContent += `
          <div style="flex: 1 1 200px; margin: 10px; border: 1px solid #ccc; padding: 10px; box-sizing: border-box;">
            ${tokenImg ? `<img src="${tokenImg}" alt="${actor.name}" style="width: 50px; height: 50px; display: block; margin: 0 auto;">` : ''}
            <label>${actor.name}</label>
            <div style="margin-bottom: 10px;">
              <label for="skills-${actor.id}">Skills:</label>
              <select name="skills-${actor.id}"></select>
            </div>
            <div style="margin-bottom: 10px;">
              <label for="difficulty-${actor.id}">Difficulty:</label>
              <select name="difficulty-${actor.id}"></select>
            </div>
            <div style="margin-bottom: 10px;">
              <label>isPrivate?</label>
              <input type="checkbox" name="isPrivate-${actor.id}">
            </div>
            <div style="margin-bottom: 10px;">
              <label for="successLevel-${actor.id}">Success Level:</label>
              <input type="number" name="successLevel-${actor.id}" style="width: 60px;" min="-9" max="99">
              <button type="button" name="roll-${actor.id}" style="margin-top: 3px;">Roll</button>
            </div>
          </div>`;
      }
    } else {
      dialogContent += `
        <div style="flex: 1 1 100%; margin: 10px; border: 1px solid #ccc; padding: 10px; box-sizing: border-box;">
          <label>Roll All!</label>
          <div style="margin-bottom: 10px;">
            <label for="skills-all">Skills:</label>
            <select name="skills-all"></select>
          </div>
          <div style="margin-bottom: 10px;">
            <label for="difficulty-all">Difficulty:</label>
            <select name="difficulty-all"></select>
          </div>
          <div style="margin-bottom: 10px;">
            <label>isPrivate?</label>
            <input type="checkbox" name="isPrivate-all">
          </div>
          <div style="margin-bottom: 10px;">
            <label for="successLevel-all">Success Level:</label>
            <input type="number" name="successLevel-all" style="width: 60px;" min="-9" max="99">
          </div>
        </div>`;
    }
    dialogContent += '</form>';
    return dialogContent;
  };

  const createDialog = () => {
    if (dialogInstance) {
      console.log("Reusing existing dialog instance");
      const dialogContent = createDialogContent(showAllActors);
      dialogInstance.data.content = dialogContent;
      dialogInstance.render(true);
    } else {
      const dialogContent = createDialogContent(showAllActors);

      dialogInstance = new Dialog({
        title: "Custom Dialog",
        content: dialogContent,
        buttons: {
          promptAll: {
            label: "Prompt All!",
            callback: (html) => {
              const formData = new FormData(html[0].querySelector("form"));
              console.log("Form Data:", formData);
            }
          },
          close: {
            label: "Close",
            callback: (html) => {
              dialogInstance = null;
            }
          }
        },
        default: "promptAll",
        render: (html) => {
          console.log("Dialog rendered");
          html.closest('.dialog').css({
            'width': 'auto',
            'height': 'auto',
            'max-width': '100%',
            'max-height': '100vh',
            'overflow': 'auto',
            'display': 'block'
          });

          html.css({
            'width': 'auto',
            'height': 'auto',
            'max-width': '100%',
            'max-height': '100vh',
            'overflow': 'auto',
          });

          $('#toggleButton').click(function() {
            showAllActors = !showAllActors;
            localStorage.setItem('showAllActors', showAllActors);
            console.log("Toggle button clicked, showAllActors:", showAllActors);
            createDialog();
          });
        }
      });

      dialogInstance.render(true);
    }
  };

  button.click(() => {
    console.log("Button clicked, dialogInstance:", dialogInstance);
    createDialog();
  });

  html.find('.main-controls').append(button);
});


//End Prompt Dialog

Hooks.on('renderChatMessage', (message, html, data) => {
  html.find('.roll-skill-test').click(async (ev) => {
    ev.preventDefault();
    const actorId = ev.currentTarget.dataset.actorId;
    const skillKey = ev.currentTarget.dataset.skillKey;
    const skillId = ev.currentTarget.dataset.skillId;
    const difficulty = ev.currentTarget.dataset.difficulty;
    const isPrivate = ev.currentTarget.dataset.private === 'true';
    const successLevel = ev.currentTarget.dataset.successLevel;
    const actor = game.actors.get(actorId);

    if (actor) {
      const skillSetup = {
        itemId: skillId || undefined,
        name: undefined,
        key: skillKey
      };

      const optionSetup = {
        title: {},
        fields: {
          difficulty: difficulties.find(diff => diff.value == difficulty)?.special_name || "unknown",
          rollMode: isPrivate ? "gmroll" : "publicroll",
          SL: isNaN(Number(successLevel)) ? 0 : Number(successLevel)
        },
      };

      if (actor.isOwner || game.user.isGM) {
        await actor.setupSkillTest(skillSetup, optionSetup, true);
        ui.notifications.info("Skill test initiated!");
      } else {
        ui.notifications.warn("You do not have permission to perform this action.");
      }
    } else {
      console.error(`Actor with ID ${actorId} not found.`);
    }
  });
});
