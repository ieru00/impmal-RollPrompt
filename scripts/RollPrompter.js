const difficulties = [
  { name: "Challenging", value: 0, special_name: "challenging" },
  { name: "Routine", value: 20, special_name: "routine" },
  { name: "Easy", value: 40, special_name: "easy" },
  { name: "Very Easy", value: 60, special_name: "veryEasy" },
  { name: "Difficult", value: -10, special_name: "difficult" },
  { name: "Hard", value: -20, special_name: "hard" },
  { name: "Very Hard", value: -30, special_name: "veryHard" },
];

const capitalizeFirstLetter = (string) =>
  string.charAt(0).toUpperCase() + string.slice(1);

function createSkillSelectionDialog(actor) {
  const skills = actor.system.skills;
  const combinedSkillsArray = [];
  const actorName = actor.name;
  const actorImage = actor.img;

  for (const skill in skills) {
    combinedSkillsArray.push({ name: skill });

    if (skills[skill].specialisations) {
      skills[skill].specialisations.forEach((spec) => {
        combinedSkillsArray.push({
          name: `${skill}: ${capitalizeFirstLetter(spec.name)}`,
          id: spec.id,
          parentSkill: skill,
        });
      });
    }
  }

  return combinedSkillsArray;
}

const sendChatMessage = (
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
        <button class="roll-button" data-skill="${skill}" data-actor="${
    actor.id
  }" data-difficulty="${difficultyValue}" data-difficulty-name="${difficultyName}" data-success-level="${successLevel}" data-private="${isPrivate}" data-owners="${owners.join(
    ","
  )}" data-gms="${game.users
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

const getActorOwners = (actor) => {
  const owners = Object.keys(actor.ownership).filter(
    (userId) => actor.ownership[userId] === 3
  ); // 3 indicates the owner permission
  const gms = game.users.filter((user) => user.isGM).map((user) => user.id);
  return [...owners, ...gms];
};

Hooks.on("renderSceneControls", (controls, html) => {
  if (!game.user.isGM) return;

  const button = $(`<li class="control-tool" title="Prompt for Rolls!">
    <i class="fas fa-dice"></i>
  </li>`);

  let showAllActors = localStorage.getItem("showAllActors") === "true";
  let dialogInstance = null;

  const createDialogContent = (showAllActors) => {
    const playerActors = canvas.tokens.placeables.filter(
      (token) => token.actor && token.actor.hasPlayerOwner
    );
    let dialogContent = `
      <div style="display: flex; justify-content: flex-start; align-items: center; margin-bottom: 10px;">
        <button id="toggleButton" style="padding: 5px 10px; margin-right: 10px;">${
          showAllActors ? "Go to Roll All Page" : "Go to Tokens Page"
        }</button>
      </div>
      <form style="display: flex; flex-wrap: wrap; overflow-x: auto; max-width: 100%;">`;

    const addDifficultyOptions = () => {
      return difficulties
        .map(
          (d) =>
            `<option value="${d.value}" data-special="${d.special_name}">${
              d.name
            } ${d.value >= 0 ? "+" : ""}${d.value}</option>`
        )
        .join("");
    };

    if (showAllActors) {
      for (const token of playerActors) {
        const actor = token.actor;
        const tokenImg = actor.img;
        const skills = createSkillSelectionDialog(actor);

        dialogContent += `
          <div style="flex: 1 1 200px; margin: 10px; border: 1px solid #ccc; padding: 10px; box-sizing: border-box;">
            ${
              tokenImg
                ? `<img src="${tokenImg}" alt="${actor.name}" style="width: 50px; height: 50px; display: block; margin: 0 auto;">`
                : ""
            }
            <label>${actor.name}</label>
            <div style="margin-bottom: 10px;">
              <label for="skills-${actor.id}">Skills:</label>
              <select name="skills-${actor.id}">
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
              <label for="difficulty-${actor.id}">Difficulty:</label>
              <select name="difficulty-${actor.id}">
                ${addDifficultyOptions()}
              </select>
            </div>
            <div style="margin-bottom: 10px;">
              <label>isPrivate?</label>
              <input type="checkbox" name="isPrivate-${actor.id}">
            </div>
            <div style="margin-bottom: 10px;">
              <label for="successLevel-${actor.id}">Success Level:</label>
              <input type="number" name="successLevel-${
                actor.id
              }" value="0" style="width: 60px;" min="-9" max="99">
              <button type="button" name="roll-${
                actor.id
              }" style="margin-top: 3px;">Roll</button>
            </div>
          </div>`;
      }
    } else {
      const allSkills = game.impmal.config.skills;

      dialogContent += `
        <div style="flex: 1 1 100%; margin: 10px; border: 1px solid #ccc; padding: 10px; box-sizing: border-box;">
          <label>Roll All!</label>
          <div style="margin-bottom: 10px;">
            <label for="skills-all">Skills:</label>
            <select name="skills-all">
              <option value="" disabled selected>(>',')>Select Skill<(','<)</option>
              ${Object.values(allSkills)
                .map((skill) => `<option value="${skill}">${skill}</option>`)
                .join("")}
            </select>
          </div>
          <div style="margin-bottom: 10px;">
            <label for="difficulty-all">Difficulty:</label>
            <select name="difficulty-all">
              ${addDifficultyOptions()}
            </select>
          </div>
          <div style="margin-bottom: 10px;">
            <label>isPrivate?</label>
            <input type="checkbox" name="isPrivate-all">
          </div>
          <div style="margin-bottom: 10px;">
            <label for="successLevel-all">Success Level:</label>
            <input type="number" name="successLevel-all" value="0" style="width: 60px;" min="-9" max="99">
            <button type="button" id="roll-all-button" style="margin-top: 3px;">Roll All</button>
          </div>
        </div>`;
    }
    dialogContent += "</form>";

    // Add event listeners for roll buttons
    Hooks.once("renderDialog", (dialog, html) => {
      html.find("button[name^='roll-']").click((event) => {
        const actorId = event.target.name.split("-")[1];
        const actor = game.actors.get(actorId);
        const skill = html.find(`select[name='skills-${actorId}']`).val();
        const skillId = html
          .find(`select[name='skills-${actorId}'] option:selected`)
          .data("id");
        const difficultyValue = html
          .find(`select[name='difficulty-${actorId}']`)
          .val();
        const difficultyName = html
          .find(`select[name='difficulty-${actorId}'] option:selected`)
          .text();
        const successLevel = html
          .find(`input[name='successLevel-${actorId}']`)
          .val();
        const isPrivate = html
          .find(`input[name='isPrivate-${actorId}']`)
          .prop("checked");

        if (!skill) {
          ui.notifications.warn(
            `${actor.name} requires a skill to be selected before rolling.`
          );
          return;
        }

        sendChatMessage(
          actor,
          skill,
          difficultyValue,
          difficultyName,
          successLevel,
          isPrivate
        );
      });

      html.find("#roll-all-button").click((event) => {
        const skill = html.find("select[name='skills-all']").val();
        const difficultyValue = html
          .find("select[name='difficulty-all']")
          .val();
        const difficultyName = html
          .find("select[name='difficulty-all'] option:selected")
          .text();
        const successLevel = html.find("input[name='successLevel-all']").val();
        const isPrivate = html
          .find("input[name='isPrivate-all']")
          .prop("checked");

        if (!skill) {
          ui.notifications.warn(
            "Please select a skill before rolling for all."
          );
          return;
        }

        const playerActors = canvas.tokens.placeables.filter(
          (token) => token.actor && token.actor.hasPlayerOwner
        );
        playerActors.forEach((token) => {
          const actor = token.actor;
          sendChatMessage(
            actor,
            skill,
            difficultyValue,
            difficultyName,
            successLevel,
            isPrivate
          );
        });
      });
    });

    return dialogContent;
  };

  const createDialog = () => {
    if (dialogInstance) {
      dialogInstance.close().then(() => {
        dialogInstance = null;
        createNewDialog();
      });
    } else {
      createNewDialog();
    }
  };

  const createNewDialog = () => {
    const dialogContent = createDialogContent(showAllActors);

    const buttons = {
      close: {
        label: "Close",
        callback: (html) => {
          dialogInstance = null;
        },
      },
    };

    if (showAllActors) {
      buttons.close = { label: "Close", callback: () => {} }; // Do nothing on close, keep dialog open
      buttons.promptAll = {
        label: "Prompt All!",
        callback: (html) => {
          const formData = new FormData(html[0].querySelector("form"));
          console.log("Form Data:", formData);

          for (const entry of formData.entries()) {
            console.log(entry[0], entry[1]);
          }

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
            const isPrivate = formData.get(`isPrivate-${actor.id}`) === "on";

            if (!skill) {
              ui.notifications.warn(
                `${actor.name} requires a skill to be selected before rolling.`
              );
              return;
            }

            sendChatMessage(
              actor,
              skill,
              difficultyValue,
              difficultyName,
              successLevel,
              isPrivate
            );
          });
        },
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
    
        $("#toggleButton").click(function () {
          showAllActors = !showAllActors;
          localStorage.setItem("showAllActors", showAllActors);
          console.log("Toggle button clicked, showAllActors:", showAllActors);
          createDialog(); // Recreate the dialog on toggle
        });
      }
    });
    
    

    dialogInstance.render(true);
  };

  button.click(() => {
    console.log("Button clicked, dialogInstance:", dialogInstance);
    createDialog();
  });

  html.find(".main-controls").append(button);
});

// Handle chat button click events
Hooks.on("renderChatMessage", (message, html, data) => {
  html.find(".roll-button").click((event) => {
    const button = $(event.currentTarget);
    const skill = button.data("skill");
    const actorId = button.data("actor");
    const difficultyValue = button.data("difficulty");
    const difficultyName = button.data("difficultyName");
    const successLevel = button.data("successLevel");
    const isPrivate = button.data("private");
    const owners = button.data("owners")
      ? button.data("owners").split(",")
      : [];
    const gms = button.data("gms") ? button.data("gms").split(",") : [];

    const userIsGM = gms.includes(game.user.id);
    const userIsOwner = owners.includes(game.user.id);

    if (userIsGM || userIsOwner) {
      const actor = game.actors.get(actorId);
      const skills = createSkillSelectionDialog(actor);
      const selectedSkill = skills.find((s) => s.name === skill);

      const skillSetup = {
        itemId: selectedSkill?.id || undefined,
        name: undefined,
        key: selectedSkill?.parentSkill || selectedSkill?.name,
      };

      const optionSetup = {
        title: {},
        fields: {
          difficulty:
            difficulties.find((diff) => diff.value == difficultyValue)
              ?.special_name || "unknown",
          rollMode: isPrivate ? "gmroll" : "publicroll",
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
