const RollPrompter = {
  // Constants
  CONSTANTS: {
    SELECT_SKILL_PLACEHOLDER: "(>',')>Select Skill<(','<)",
    OWNERSHIP_LEVEL: 3,
    MIN_SUCCESS_LEVEL: -9,
    MAX_SUCCESS_LEVEL: 99,
    BUTTON_READY_DELAY: 2000,
    CANVAS_READY_DELAY: 500
  },

  // State management
  state: {
    dialogInstance: null,
    showAllActors: localStorage.getItem("showAllActors") === "true"
  },

  // Helper function to get tokens in V13 compatible way
  getTokens() {
    if (canvas.tokens.objects && typeof canvas.tokens.objects.values === 'function') {
      return Array.from(canvas.tokens.objects.values());
    } else if (canvas.tokens.objects && canvas.tokens.objects.children) {
      return canvas.tokens.objects.children;
    } else if (canvas.tokens.placeables) {
      return canvas.tokens.placeables;
    }
    return [];
  },

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
      (userId) => actor.ownership[userId] === this.CONSTANTS.OWNERSHIP_LEVEL
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

  // HTML Template Functions
  createDifficultyOptions() {
    return this.DIFFICULTIES
      .map(d => `<option value="${d.value}" data-special="${d.special_name}">${d.name} ${d.value >= 0 ? "+" : ""}${d.value}</option>`)
      .join("");
  },

  createRollModeOptions() {
    return this.ROLLMODE
      .map(mode => `<option value="${mode.value}">${mode.name}</option>`)
      .join("");
  },

  createSkillOptions(skills) {
    return skills
      .map(skill => `<option value="${skill.name}" data-id="${skill.id}">${skill.name}</option>`)
      .join("");
  },

  createAllSkillsOptions(allSkillsAndSpecs) {
    return allSkillsAndSpecs
      .map(skillObj => {
        if (skillObj.isSpecialisation) {
          return `<option value="${skillObj.name}" data-is-spec="true" data-parent-skill="${skillObj.parentSkill}" data-id="${skillObj.id || ''}">${skillObj.name}</option>`;
        } else {
          return `<option value="${skillObj.name}">${skillObj.name}</option>`;
        }
      })
      .join("");
  },

  createToggleSection(showAllActors) {
    return `
      <div class="toggle-container">
        <span class="toggle-label">Individual Actors</span>
        <label class="toggle-switch">
          <input type="checkbox" id="toggleButton" ${!showAllActors ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
        <span class="toggle-label">Prompt All</span>
      </div>`;
  },

  createActorCard(actor, skills) {
    const tokenImg = actor.img;
    return `
      <div style="flex: 1 1 200px; margin: 10px; border: 1px solid #ccc; padding: 10px; box-sizing: border-box;">
        ${tokenImg ? `<img src="${tokenImg}" alt="${actor.name}" style="width: 100px; height: 100px; display: block; margin: 0 auto;">` : ""}
        <h3 style="text-align: center; margin: 5px 0;">${actor.name}</h3>
        <div style="margin-bottom: 10px;">
          <div style="margin-bottom: 5px;">
            <label for="skills-${actor.id}">Skills:</label>
          </div>
          <select name="skills-${actor.id}" style="width: 100%;">
            <option value="" disabled selected>${this.CONSTANTS.SELECT_SKILL_PLACEHOLDER}</option>
            ${this.createSkillOptions(skills)}
          </select>
        </div>
        <div style="margin-bottom: 10px;">
          <div style="margin-bottom: 5px;">
            <label for="difficulty-${actor.id}">Difficulty:</label>
          </div>
          <select name="difficulty-${actor.id}" style="width: 100%;">
            ${this.createDifficultyOptions()}
          </select>
        </div>
        <div style="margin-bottom: 10px;">
          <div style="margin-bottom: 5px;">
            <label for="rollMode-${actor.id}">Roll Mode:</label>
          </div>
          <select name="rollMode-${actor.id}" style="width: 100%;">
            ${this.createRollModeOptions()}
          </select>
        </div>
        <div style="margin-bottom: 10px;">
          <div style="margin-bottom: 5px;">
            <label for="successLevel-${actor.id}">Success Level:</label>
          </div>
          <input type="number" class="spinner" name="successLevel-${actor.id}" value="0" min="${this.CONSTANTS.MIN_SUCCESS_LEVEL}" max="${this.CONSTANTS.MAX_SUCCESS_LEVEL}">
          <button type="button" name="roll-${actor.id}" style="margin-top: 3px;">Roll</button>
        </div>
      </div>`;
  },

  createPromptAllSection(allSkillsAndSpecs, playerActors) {
    return `
      <div style="display: flex; gap: 10px;">
        <div style="flex: 2; border: 1px solid #ccc; padding: 10px; box-sizing: border-box;">
          <h3 style="text-align: center; margin: 5px 0;">Prompt All!</h3>
          <div style="margin-bottom: 10px;">
            <div style="margin-bottom: 5px;">
              <label for="skills-all">Skills:</label>
            </div>
            <select name="skills-all" style="width: 100%;">
              <option value="" disabled selected>${this.CONSTANTS.SELECT_SKILL_PLACEHOLDER}</option>
              ${this.createAllSkillsOptions(allSkillsAndSpecs)}
            </select>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="margin-bottom: 5px;">
              <label for="difficulty-all">Difficulty:</label>
            </div>
            <select name="difficulty-all" style="width: 100%;">
              ${this.createDifficultyOptions()}
            </select>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="margin-bottom: 5px;">
              <label for="rollMode-all">Roll Mode:</label>
            </div>
            <select name="rollMode-all" style="width: 100%;">
              ${this.createRollModeOptions()}
            </select>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="margin-bottom: 5px;">
              <label for="successLevel-all">Success Level:</label>
            </div>
            <input type="number" class="spinner" name="successLevel-all" value="0" min="${this.CONSTANTS.MIN_SUCCESS_LEVEL}" max="${this.CONSTANTS.MAX_SUCCESS_LEVEL}">
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

  getAllSpecialisations() {
    const playerActors = this.getTokens()
      .filter((token) => token.actor && token.actor.hasPlayerOwner)
      .map(token => token.actor);
    
    const allSkillsAndSpecs = [];
    const allSkills = game.impmal.config.skills;
    
    for (const skill in allSkills) {
      allSkillsAndSpecs.push({ 
        name: skill,
        isSpecialisation: false,
        parentSkill: null
      });
    }
    
    playerActors.forEach(actor => {
      const skills = actor.system.skills;
      for (const skillName in skills) {
        if (skills[skillName].specialisations) {
          skills[skillName].specialisations.forEach((spec) => {
            // Check if this specialisation is already in the array
            const existingSpecIndex = allSkillsAndSpecs.findIndex(
              s => s.isSpecialisation && s.name === `${skillName}: ${this.capitalizeFirstLetter(spec.name)}`
            );
            
            // Only add if it doesn't exist yet
            if (existingSpecIndex === -1) {
              allSkillsAndSpecs.push({
                name: `${skillName}: ${this.capitalizeFirstLetter(spec.name)}`,
                id: spec.id,
                isSpecialisation: true,
                parentSkill: skillName
              });
            }
          });
        }
      }
    });
    
    allSkillsAndSpecs.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    
    return allSkillsAndSpecs;
  },

  createDialogContent(showAllActors) {
    const playerActors = this.getTokens().filter(
      (token) => token.actor && token.actor.hasPlayerOwner
    );
    const allSkillsAndSpecs = this.getAllSpecialisations();
    
    let dialogContent = this.createToggleSection(showAllActors);
    dialogContent += '<form style="display: flex; flex-wrap: wrap; overflow-x: auto; max-width: 100%;">';

    if (showAllActors) {
      // Individual Token Dialog Content
      for (const token of playerActors) {
        const actor = token.actor;
        const skills = this.createSkillSelectionDialog(actor);
        dialogContent += this.createActorCard(actor, skills);
      }
    } else {
      // Prompt All Dialog Content
      dialogContent += this.createPromptAllSection(allSkillsAndSpecs, playerActors);
    }
    
    dialogContent += "</form>";
    return dialogContent;
  },

  // Event Handler Functions
  handleToggleButton(html) {
    html.find("#toggleButton").click(() => {
      this.state.showAllActors = !html.find("#toggleButton")[0].checked;
      localStorage.setItem("showAllActors", this.state.showAllActors);
      console.log("Toggle button clicked, showAllActors:", this.state.showAllActors);
      if (this.state.dialogInstance?.rendered) {
        this.state.dialogInstance.close();
      }
      this.state.dialogInstance = null;
      this.state.dialogInstance = this.renderDialog(this.state.showAllActors, null);
    });
  },

  handleIndividualRollButtons(html) {
    const self = this;
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
  },

  handlePromptAllButton(html) {
    const self = this;
    html.find("#prompt-all-button").click((event) => {
      const selectedOption = html.find("select[name='skills-all'] option:selected");
      const skill = selectedOption.val();
      const isSpecialisation = selectedOption.data("isSpec") === true;
      const parentSkill = selectedOption.data("parentSkill");
      const specId = selectedOption.data("id");
      const difficultyValue = html.find("select[name='difficulty-all']").val();
      const difficultyName = html.find("select[name='difficulty-all'] option:selected").text();
      const successLevel = html.find("input[name='successLevel-all']").val();
      const rollMode = html.find("select[name='rollMode-all']").val();
    
      if (!skill) {
        ui.notifications.warn("Please select a skill before rolling for all.");
        return;
      }
    
      const playerActors = RollPrompter.getTokens().filter(
        (token) => token.actor && token.actor.hasPlayerOwner
      ).filter(token => {
        return html.find(`input[name="selected-token-${token.actor.id}"]`).prop("checked");
      });
    
      playerActors.forEach((token) => {
        const actor = token.actor;
        
        if (isSpecialisation && parentSkill) {
          const actorSkills = self.createSkillSelectionDialog(actor);
          const hasSpecialisation = actorSkills.some(s => s.name === skill);
          
          if (!hasSpecialisation) {
            self.sendChatMessage(actor, parentSkill, difficultyValue, difficultyName, successLevel, rollMode);
            return;
          }
        }
        
        self.sendChatMessage(actor, skill, difficultyValue, difficultyName, successLevel, rollMode);
      });
    });
  },

  setupDialogEventHandlers(html, showAllActors) {
    this.handleToggleButton(html);
    this.handleIndividualRollButtons(html);
    
    if (!showAllActors) {
      this.handlePromptAllButton(html);
    }
  },

  createDialogButtons(showAllActors) {
    const self = this;
    
    if (showAllActors) {
      return {
        promptAll: {  
          label: "Prompt All!",
          callback: (html) => {
            const formData = new FormData(html[0].querySelector("form"));
            const actorTokens = RollPrompter.getTokens().filter(
              (token) => token.actor && token.actor.hasPlayerOwner
            );
            
            actorTokens.forEach((token) => {
              const actor = token.actor;
              const skill = formData.get(`skills-${actor.id}`);
              const difficultyValue = formData.get(`difficulty-${actor.id}`);
              const difficultyName = html.find(`select[name='difficulty-${actor.id}'] option:selected`).text();
              const successLevel = formData.get(`successLevel-${actor.id}`);
              const rollMode = formData.get(`rollMode-${actor.id}`);

              if (!skill) {
                ui.notifications.warn(`${actor.name} requires a skill to be selected before rolling.`);
                return;
              }

              self.sendChatMessage(actor, skill, difficultyValue, difficultyName, successLevel, rollMode);
            });
          },
        },
        close: { label: "Close", callback: () => {} }
      };
    } else {
      return {
        close: { 
          label: "Close", 
          callback: (html) => { this.state.dialogInstance = null; } 
        }
      };
    }
  },

  setupDialogStyles(html) {
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
  },

  renderDialog(showAllActors, dialogInstance) {
    const dialogContent = this.createDialogContent(showAllActors);
    const buttons = this.createDialogButtons(showAllActors);

    dialogInstance = new Dialog({
      title: "Roll Prompter",
      content: dialogContent,
      buttons: buttons,
      default: "close",
      render: (html) => {
        this.setupDialogStyles(html);
        this.setupDialogEventHandlers(html, showAllActors);
      }
    });

    dialogInstance.render(true);
    return dialogInstance;
  },

  addSceneControlButton() {
    // Remove existing button if it exists
    $("#rollprompter-control").remove();
    
    // Create the button with V13 structure
    const button = $(`<li>
      <button type="button" id="rollprompter-control" class="control ui-control layer icon fa-solid fa-dice" 
              role="tab" data-action="control" data-control="rollprompter" 
              data-tooltip="" aria-pressed="false" aria-label="Prompt for Rolls!"></button>
    </li>`);

    // Bind click event to the button inside the li
    button.find('button').on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.state.dialogInstance?.rendered) {
        this.state.dialogInstance.close();
      }
      this.state.dialogInstance = null;
      this.state.dialogInstance = this.renderDialog(this.state.showAllActors, null);
    });

    // Target the layers menu specifically (first menu in scene-controls)
    let targetElement = null;
    let location = "";
    
    // Look for the layers menu specifically
    if ($("#scene-controls-layers").length > 0) {
      targetElement = $("#scene-controls-layers");
      location = "#scene-controls-layers";
    } else if ($("#scene-controls").children().first().length > 0) {
      targetElement = $("#scene-controls").children().first();
      location = "#scene-controls first child";
    } else if ($("#scene-controls").length > 0) {
      targetElement = $("#scene-controls");
      location = "#scene-controls";
    }
    
    if (targetElement && targetElement.length > 0) {
      targetElement.append(button);
      return true;
    } else {
      console.warn("RollPrompter: Could not find suitable location for scene control button");
      return false;
    }
  }
};

Hooks.once("ready", () => {
  if (game.user.isGM) {
    setTimeout(() => {
      RollPrompter.addSceneControlButton();
    }, RollPrompter.CONSTANTS.BUTTON_READY_DELAY);
  }
});

// Also try when canvas is ready
Hooks.on("canvasReady", () => {
  if (game.user.isGM) {
    setTimeout(() => {
      RollPrompter.addSceneControlButton();
    }, RollPrompter.CONSTANTS.CANVAS_READY_DELAY);
  }
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
      
      let skillSetup;
      
      if (skill.includes(":")) {
        const parentSkill = skill.split(":")[0].trim();
        
        const selectedSkill = skills.find((s) => s.name === skill);
        
        if (selectedSkill) {
          // Actor has this specialisation
          skillSetup = {
            itemId: selectedSkill.id || undefined,
            name: skill,
            key: selectedSkill.parentSkill || parentSkill,
          };
        } else {
          // Actor doesn't have this specialisation, fall back to parent skill
          skillSetup = {
            itemId: undefined,
            name: parentSkill,
            key: parentSkill
          };
        }
      } else {
        // Regular skill (not a specialisation)
        skillSetup = {
          itemId: undefined,
          name: undefined,
          key: skill
        };
      }

      const optionSetup = {
        title: `${skill.charAt(0).toUpperCase() + skill.slice(1)}`,
        fields: {
          difficulty:
            RollPrompter.DIFFICULTIES.find((diff) => diff.value == difficultyValue)
              ?.special_name || "unknown",
          rollMode: rollMode || "publicroll",
          SL: isNaN(Number(successLevel)) ? 0 : Number(successLevel),
        },
      };

      // setupSkillTest returns a Promise, handle it properly
      actor.setupSkillTest(skillSetup, optionSetup, true).then(result => {
        console.log("Roll completed successfully:", result);
      }).catch(error => {
        console.error("Roll failed:", error);
        ui.notifications.error(`Roll failed: ${error.message}`);
      });
    } else {
      ui.notifications.warn(
        "You do not have permission to roll for this actor."
      );
    }
  });
});