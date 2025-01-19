import { capitalizeFirstLetter } from './rp_utils.js';

export function createSkillSelectionDialog(actor) {
  const skills = actor.system.skills;
  const combinedSkillsArray = [];

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