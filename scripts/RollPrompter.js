const RollPrompter = {
  DIFFICULTIES: [
    { name: "Challenging", value: 0, special_name: "challenging" },
    { name: "Routine", value: 20, special_name: "routine" },
    { name: "Easy", value: 40, special_name: "easy" },
    { name: "Very Easy", value: 60, special_name: "veryEasy" },
    { name: "Difficult", value: -10, special_name: "difficult" },
    { name: "Hard", value: -20, special_name: "hard" },
    { name: "Very Hard", value: -30, special_name: "veryHard" },
  ],

  ROLLMODE: [
    { name: "Public", value: "publicroll" },
    { name: "Private GM", value: "gmroll"},
    { name: "Blind GM", value: "blindroll" },
  ],

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },

  getActorOwners(actor) {
    const owners = Object.keys(actor.ownership).filter(
      (userId) => actor.ownership[userId] === 3
    );
    const gms = game.users.filter((user) => user.isGM).map((user) => user.id);
    return [...owners, ...gms];
  },

  createSkillSelectionDialog(actor) {
    const skills = actor.system.skills;
    const combinedSkillsArray = [];

    for (const skill in skills) {
      combinedSkillsArray.push({ name: skill });

      if (skills[skill].specialisations) {
        skills[skill].specialisations.forEach((spec) => {
          combinedSkillsArray.push({
            name: `${skill}: ${this.capitalizeFirstLetter(spec.name)}`,
            id: spec.id,
            parentSkill: skill,
          });
        });
      }
    }

    return combinedSkillsArray;
  },

  sendChatMessage(actor, skill, difficultyValue, difficultyName, successLevel, rollMode) {
    const img = actor.img;
    const actorName = actor.name;
    const skillName = this.capitalizeFirstLetter(skill);
    const difficultyText = `${this.capitalizeFirstLetter(difficultyName)}`;
    const owners = this.getActorOwners(actor);
    const isPrivate = rollMode !== "publicroll";
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
            data-success-level="${successLevel}" data-rollmode="${rollMode}" 
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
  },

  createDialogContent(showAllActors) {
    const playerActors = canvas.tokens.placeables.filter(
      (token) => token.actor && token.actor.hasPlayerOwner
    );
    const allSkills = game.impmal.config.skills;
    
    let dialogContent = `
      <div class="toggle-container">
        <span class="toggle-label">Individual Actors</span>
        <label class="toggle-switch">
          <input type="checkbox" id="toggleButton" ${!showAllActors ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
        <span class="toggle-label">Prompt All</span>
      </div>
      <form style="display: flex; flex-wrap: wrap; overflow-x: auto; max-width: 100%;">`;

    const addDifficultyOptions = () => {
      return this.DIFFICULTIES
        .map(
          (d) =>
            `<option value="${d.value}" data-special="${d.special_name}">${
              d.name
            } ${d.value >= 0 ? "+" : ""}${d.value}</option>`
        )
        .join("");
    };

    const addRollModeOptions = () => {
      return this.ROLLMODE
        .map(
          (mode) =>
            `<option value="${mode.value}">${mode.name}</option>`
        )
        .join("");
    };

    if (showAllActors) {
      for (const token of playerActors) {
        const actor = token.actor;
        const tokenImg = actor.img;
        const skills = this.createSkillSelectionDialog(actor);
        

        //Individual Token Dialog Content
        dialogContent += `
          <div style="flex: 1 1 200px; margin: 10px; border: 1px solid #ccc; padding: 10px; box-sizing: border-box;">
            ${
              tokenImg
                ? `<img src="${tokenImg}" alt="${actor.name}" style="width: 100px; height: 100px; display: block; margin: 0 auto;">`
                : ""
            }
            <h3 style="text-align: center; margin: 5px 0;">${actor.name}</h3>
            <div style="margin-bottom: 10px;">
              <div style="margin-bottom: 5px;">
                <label for="skills-${actor.id}">Skills:</label>
              </div>
              <select name="skills-${actor.id}" style="width: 100%;">
                <option value="" disabled selected>(>',')>Select Skill<(','<)</option>
                ${skills
                  .map(
                    (skill) =>
                      `<option value="${skill.name}" data-id="${skill.id}">${skill.name}</option>`
                  )
                  .join("")}
              </select>
            </div>
            <div style="margin-bottom: 10px;">
              <div style="margin-bottom: 5px;">
                <label for="difficulty-${actor.id}">Difficulty:</label>
              </div>
              <select name="difficulty-${actor.id}" style="width: 100%;">
                ${addDifficultyOptions()}
              </select>
            </div>
            <div style="margin-bottom: 10px;">
              <div style="margin-bottom: 5px;">
                <label for="rollMode-${actor.id}">Roll Mode:</label>
              </div>
              <select name="rollMode-${actor.id}" style="width: 100%;">
                ${addRollModeOptions()}
              </select>
            </div>
            <div style="margin-bottom: 10px;">
              <div style="margin-bottom: 5px;">
                <label for="successLevel-${actor.id}">Success Level:</label>
              </div>
              <input type="number" class="spinner" name="successLevel-${actor.id}" value="0" min="-9" max="99">
              <button type="button" name="roll-${actor.id}" style="margin-top: 3px;">Roll</button>
            </div>
          </div>`;
      }
    } else {

      //Prompt All Dialog Content
      dialogContent += `
        <div style="display: flex; gap: 10px;">
          <div style="flex: 2; border: 1px solid #ccc; padding: 10px; box-sizing: border-box;">
            <h3 style="text-align: center; margin: 5px 0;">Prompt All!</h3>
            <div style="margin-bottom: 10px;">
              <div style="margin-bottom: 5px;">
                <label for="skills-all">Skills:</label>
              </div>
              <select name="skills-all" style="width: 100%;">
                <option value="" disabled selected>(>',')>Select Skill<(','<)</option>
                ${Object.keys(allSkills)
                  .map((skill) => `<option value="${skill}">${skill}</option>`)
                  .join("")}
              </select>
            </div>
            <div style="margin-bottom: 10px;">
              <div style="margin-bottom: 5px;">
                <label for="difficulty-all">Difficulty:</label>
              </div>
              <select name="difficulty-all" style="width: 100%;">
                ${addDifficultyOptions()}
              </select>
            </div>
            <div style="margin-bottom: 10px;">
              <div style="margin-bottom: 5px;">
                <label for="rollMode-all">Roll Mode:</label>
              </div>
              <select name="rollMode-all" style="width: 100%;">
                ${addRollModeOptions()}
              </select>
            </div>
            <div style="margin-bottom: 10px;">
              <div style="margin-bottom: 5px;">
                <label for="successLevel-all">Success Level:</label>
              </div>
              <input type="number" class="spinner" name="successLevel-all" value="0" min="-9" max="99">
              <button type="button" id="prompt-all-button" style="margin-top: 3px;">Prompt All</button>
            </div>
          </div>
          <div style="flex: 1; border: 1px solid #ccc; padding: 10px; max-height: 300px; overflow-y: auto;">
            <h3 style="text-align: center; margin: 5px 0;">Tokens</h3>
            ${playerActors.map(token => `
              <div style="margin-bottom: 5px;">
                <label>
                  <input type="checkbox" name="selected-token-${token.actor.id}" checked>
                  ${token.actor.name}
                </label>
              </div>
            `).join('')}
          </div>
        </div>`;
    }
    dialogContent += "</form>";
    return dialogContent;
  },

  renderDialog(showAllActors, dialogInstance) {
    const dialogContent = this.createDialogContent(showAllActors);
    const self = this;

    let buttons = {};

    if (showAllActors) {
      buttons = {
        promptAll: {  
          label: "Prompt All!",
          callback: (html) => {
            const formData = new FormData(html[0].querySelector("form"));

            const actorTokens = canvas.tokens.placeables.filter(
              (token) => token.actor && token.actor.hasPlayerOwner
            );
            actorTokens.forEach((token) => {
              const actor = token.actor;
              const skill = formData.get(`skills-${actor.id}`);
              const difficultyValue = formData.get(`difficulty-${actor.id}`);
              const difficultyName = html
                .find(`select[name='difficulty-${actor.id}'] option:selected`)
                .text();
              const successLevel = formData.get(`successLevel-${actor.id}`);
              const rollMode = formData.get(`rollMode-${actor.id}`);

              if (!skill) {
                ui.notifications.warn(
                  `${actor.name} requires a skill to be selected before rolling.`
                );
                return;
              }

              self.sendChatMessage(
                actor,
                skill,
                difficultyValue,
                difficultyName,
                successLevel,
                rollMode
              );
            });
          },
        },
        close: {
          label: "Close",
          callback: () => {}
        }
      };
    } else {
      // In the "Roll All" view, only show close button
      buttons = {
        close: {
          label: "Close",
          callback: (html) => {
            dialogInstance = null;
          }
        }
      };
    }

    dialogInstance = new Dialog({
      title: "Roll Prompter",
      content: dialogContent,
      buttons: buttons,
      default: "close",
      render: (html) => {
        console.log("Dialog rendered");
        html.closest(".dialog").addClass("resizable-dialog");
        html.closest(".dialog").css({
          width: "auto",
          height: "auto",
          "max-width": "100%",
          "max-height": "100vh",
          overflow: "auto",
          display: "block",
        });
    
        html.css({
          width: "auto",
          height: "auto",
          "max-width": "100%",
          "max-height": "100vh",
          overflow: "auto",
        });

        // Toggle between the two prompt pages, no toggle switch in wh40k css for right now.
html.find("#toggleButton").click(function() {
  globalShowAllActors = !this.checked;
  localStorage.setItem("showAllActors", globalShowAllActors);
  console.log("Toggle button clicked, showAllActors:", globalShowAllActors);
  if (globalDialogInstance?.rendered) {
    globalDialogInstance.close();
  }
  globalDialogInstance = null;
  globalDialogInstance = RollPrompter.renderDialog(globalShowAllActors, null);
});

        // Add event listeners for roll buttons
        html.find("button[name^='roll-']").click((event) => {
          const actorId = event.target.name.split("-")[1];
          const actor = game.actors.get(actorId);
          const skill = html.find(`select[name='skills-${actorId}']`).val();
          const difficultyValue = html.find(`select[name='difficulty-${actorId}']`).val();
          const difficultyName = html.find(`select[name='difficulty-${actorId}'] option:selected`).text();
          const successLevel = html.find(`input[name='successLevel-${actorId}']`).val();
          const rollMode = html.find(`select[name='rollMode-${actorId}']`).val();

          if (!skill) {
            ui.notifications.warn(`${actor.name} requires a skill to be selected before rolling.`);
            return;
          }

          self.sendChatMessage(actor, skill, difficultyValue, difficultyName, successLevel, rollMode);
        });

        html.find("#prompt-all-button").click((event) => {
          const skill = html.find("select[name='skills-all']").val();
          const difficultyValue = html.find("select[name='difficulty-all']").val();
          const difficultyName = html.find("select[name='difficulty-all'] option:selected").text();
          const successLevel = html.find("input[name='successLevel-all']").val();
          const rollMode = html.find("select[name='rollMode-all']").val();
        
          if (!skill) {
            ui.notifications.warn("Please select a skill before rolling for all.");
            return;
          }
        
          const playerActors = canvas.tokens.placeables.filter(
            (token) => token.actor && token.actor.hasPlayerOwner
          ).filter(token => {
            return html.find(`input[name="selected-token-${token.actor.id}"]`).prop("checked");
          });
        
          playerActors.forEach((token) => {
            const actor = token.actor;
            self.sendChatMessage(actor, skill, difficultyValue, difficultyName, successLevel, rollMode);
          });
        });
      }
    });

    dialogInstance.render(true);
    return dialogInstance;
  }
};

let globalDialogInstance = null;
let globalShowAllActors = localStorage.getItem("showAllActors") === "true";

Hooks.on("renderSceneControls", (controls, html) => {
  if (!game.user.isGM) return;

  const button = $(`<li class="control-tool" title="Prompt for Rolls!">
    <i class="fas fa-dice"></i>
  </li>`);

  button.click(() => {
    console.log("Button clicked, dialogInstance:", globalDialogInstance);
    if (globalDialogInstance?.rendered) {
      globalDialogInstance.close();
    }
    globalDialogInstance = null;
    globalDialogInstance = RollPrompter.renderDialog(globalShowAllActors, null);
  });

  html.find(".main-controls").append(button);
});

Hooks.on("renderChatMessage", (message, html, data) => {
  html.find(".roll-button").click((event) => {
    const button = $(event.currentTarget);
    const skill = button.data("skill");
    const actorId = button.data("actor");
    const difficultyValue = button.data("difficulty");
    const difficultyName = button.data("difficultyName");
    const successLevel = button.data("successLevel");
    const rollMode = button.data("rollmode");
    const owners = button.data("owners") ? button.data("owners").split(",") : [];
    const gms = button.data("gms") ? button.data("gms").split(",") : [];

    const userIsGM = gms.includes(game.user.id);
    const userIsOwner = owners.includes(game.user.id);

    if (userIsGM || userIsOwner) {
      const actor = game.actors.get(actorId);
      const allSkills = game.impmal.config.skills;
      const skills = RollPrompter.createSkillSelectionDialog(actor);
      
      const isPromptAllSkill = Object.values(allSkills).includes(skill);
      
      let skillSetup;
      
      if (isPromptAllSkill) {
        skillSetup = {
          itemId: undefined,
          name: undefined,
          key: skill
        };
      } else {
        const selectedSkill = skills.find((s) => s.name === skill);
        skillSetup = {
          itemId: selectedSkill?.id || undefined,
          name: undefined,
          key: selectedSkill?.parentSkill || selectedSkill?.name,
        };
      }

      const optionSetup = {
        title: {},
        fields: {
          difficulty:
            RollPrompter.DIFFICULTIES.find((diff) => diff.value == difficultyValue)
              ?.special_name || "unknown",
          rollMode: rollMode || "publicroll",
          SL: isNaN(Number(successLevel)) ? 0 : Number(successLevel),
        },
      };

      actor.setupSkillTest(skillSetup, optionSetup, true);
    } else {
      ui.notifications.warn(
        "You do not have permission to roll for this actor."
      );
    }
  });
});