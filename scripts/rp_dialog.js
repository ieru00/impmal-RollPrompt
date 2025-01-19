import { DIFFICULTIES } from './rp_config.js';
import { createSkillSelectionDialog } from './rp_skills.js';
import { sendChatMessage } from './rp_chat.js';

export class RollDialog {
  static createDialogContent(showAllActors) {
    const playerActors = canvas.tokens.placeables.filter(
      (token) => token.actor && token.actor.hasPlayerOwner
    );
    let dialogContent = `
      <div style="display: flex; justify-content: flex-start; align-items: center; margin-bottom: 10px;">
        <button id="toggleButton" style="padding: 5px 10px; margin-right: 10px;">
          ${showAllActors ? "Go to Roll All Page" : "Go to Tokens Page"}
        </button>
      </div>
      <form style="display: flex; flex-wrap: wrap; overflow-x: auto; max-width: 100%;">`;

    const addDifficultyOptions = () => {
      return DIFFICULTIES
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
                ? `<img src="${tokenImg}" alt="${actor.name}" style="width: 100px; height: 100px; display: block; margin: 0 auto;">`
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
              <input type="number" name="successLevel-${actor.id}" value="0" style="width: 60px;" min="-9" max="99">
              <button type="button" name="roll-${actor.id}" style="margin-top: 3px;">Roll</button>
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
    return dialogContent;
  }

  static render(showAllActors, dialogInstance) {
    const dialogContent = this.createDialogContent(showAllActors);

    const buttons = {
      close: {
        label: "Close",
        callback: (html) => {
          dialogInstance = null;
        },
      },
    };

    if (showAllActors) {
      buttons.close = { label: "Close", callback: () => {} };
      buttons.promptAll = {
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
          RollDialog.render(showAllActors, dialogInstance);
        });
      }
    });

    dialogInstance.render(true);
    return dialogInstance;
  }
}