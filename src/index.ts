import { Principal, text, $query, $update, Opt, Record, StableBTreeMap, Result, match, Vec } from "azle";


// Donor: The Person who donates to the campaign
type Donor = Record<{
  id: Principal;
  amount: number;
}>;

const generateId = () => (""+Math.random()).substring(2,7);

// Campaign: The Campaign that is created by the proposer
type Campaign = Record<{
    id: string;
    proposer: Principal;
    title: string;
    description: string;
    goal: number;
    totalDonations: number;
    donors:  Vec<Donor>
  }>;

// campaignStorage: The storage that stores all the campaigns
const campaignStorage = new StableBTreeMap<string, Campaign>(0, 44, 1024); 

/*
createCampaign: Creates a new campaign by taking the proposer, title, description and goal as input,
by default the totalDonations is 0 and donors is empty
*/

/**
 * Creates a new campaign.
 *
 * @param _proposer - The proposer of the campaign.
 * @param _title - The title of the campaign.
 * @param _description - The description of the campaign.
 * @param _goal - The goal amount of the campaign.
 * @returns A result object containing the created campaign or an error string.
 */
$update;
export function createCampaign (_proposer: Principal, _title:text, _description:text, _goal:number,): Result<Campaign, string> {
  try {
    if (!_proposer) {
      return Result.Err<Campaign, string>("Proposer is required");
    }
    if (!_title || _title.trim().length === 0) {
      return Result.Err<Campaign, string>("Title is required");
    }
    if (!_description || _description.trim().length === 0) {
      return Result.Err<Campaign, string>("Description is required");
    }
    if (!_goal || _goal <= 0) {
      return Result.Err<Campaign, string>("Goal should be greater than 0");
    }

    const campaign: Campaign = {
      id:generateId(),
      proposer: _proposer,
      title: _title,
      description: _description,
      goal: _goal,
      totalDonations: 0,
      donors: [] as Vec<Donor>
    };

    campaignStorage.insert(campaign.id, campaign);
    return Result.Ok(campaign);
  } catch (err) {
    if (err instanceof Error) {
      return Result.Err<Campaign, string>(`Failed to create campaign: ${err.message}`);
    } else {
      return Result.Err<Campaign, string>('Failed to create campaign: Unexpected error, Please try again later');
    }
  }
}


/**
 * Updates the title and description of a campaign by its ID.
 *
 * @param _campaignId - The ID of the campaign to update.
 * @param _title - The new title of the campaign.
 * @param _description - The new description of the campaign.
 * @returns A result object containing the updated campaign or an error string.
 */
$update;
export function updateOnlyTitleandDescription (_campaignId: string, _title:string, _description:string): Result<Campaign, string> {
  
    return match(campaignStorage.get(_campaignId), {
      Some: (campaign) => {
        campaign.title = _title;
        campaign.description = _description;
        campaignStorage.insert(_campaignId, campaign);
        return Result.Ok<Campaign,string>(campaign);
      },
      None: () => Result.Err<Campaign, string>(`the campaign with id=${_campaignId} is not found`),
    });
}


/**
 * Donates a certain amount to a campaign by a donor.
 *
 * @param _campaignId - The ID of the campaign to donate to.
 * @param _donorId - The ID of the donor.
 * @param _amount - The amount to donate.
 * @returns A result object containing the updated campaign or an error string.
 */
$update;
export function donateCampaign (_campaignId: string, _donorId: Principal, _amount: number): Result<Campaign, string> {
  
    return match(campaignStorage.get(_campaignId), {
      Some: (campaign) => {
        const newDonor: Donor = { id: _donorId, amount: _amount };
          campaign.donors.push(newDonor);
          if(campaign.goal >= campaign.totalDonations + _amount) {
          campaign.totalDonations += _amount;
          } else {
            return Result.Err<Campaign, string>(`Donation amount is greater than the goal`);
          }
          campaignStorage.insert(_campaignId, campaign);
          return Result.Ok<Campaign,string>(campaign);
      },
      None: () => Result.Err<Campaign, string>(`the campaign with id=${_campaignId} is not found`),
    });
}

/*
getCampaign: Gets the campaign by taking the campaignId as input,
*/
/**
 * Gets a campaign by its ID.
 *
 * @param id - The ID of the campaign to get.
 * @returns A result object containing the campaign or an error string.
 */
$query;
export function getCampaign (id: string): Result<Campaign, string> {
  return match(campaignStorage.get(id), {
    Some: (campaign) => Result.Ok<Campaign, string>(campaign),
    None: () => Result.Err<Campaign, string>(`the campaign with id=${id} is not found`),
  });
}


/**
 * Deletes a campaign by its ID.
 *
 * @param id - The ID of the campaign to delete.
 * @returns A result object containing the campaign or an error string.
 */
$update;
export function deleteCampaign (id: string): Result<Campaign, string> {
  return match(campaignStorage.remove(id), {
    Some: (deletedCampaign) => Result.Ok<Campaign, string>(deletedCampaign),
    None: () => Result.Err<Campaign, string>(`the campaign with id=${id} is not found`),
  })
}

