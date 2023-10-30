import {
  Principal,
  text,
  $query,
  $update,
  StableBTreeMap,
  Result,
  match,
  Vec,
  ic,
  UUID,
} from "azle";
import { Campaign, Donor } from "./types";

const campaignStorage = new StableBTreeMap<string, Campaign>(0, 44, 1024);

export function createCampaign(
  _proposer: Principal,
  _title: text,
  _description: text,
  _goal: number,
  _deadline: number
): Result<Campaign, string> {
  if (!_proposer || typeof _proposer !== 'principal') {
    return Result.Err<Campaign, string>("Invalid proposer");
  }
  if (!_title || _title.trim().length === 0 || typeof _title !== 'string') {
    return Result.Err<Campaign, string>("Invalid title");
  }
  if (!_description || _description.trim().length === 0 || typeof _description !== 'string') {
    return Result.Err<Campaign, string>("Invalid description");
  }
  if (!_goal <= 0 || typeof _goal !== 'number') {
    return Result.Err<Campaign, string>("Invalid goal");
  }

  const presentTime = Number(ic.time());
  const nanoSeconds = Number(_deadline * 24 * 60 * 60 * 1_000_000_000); // Convert days to nanoseconds
  const endDate = presentTime + nanoSeconds;

  const id = UUID.generate();
  const campaign: Campaign = {
    id,
    proposer: _proposer,
    title: _title,
    description: _description,
    goal: _goal,
    totalDonations: 0,
    deadline: endDate,
    donors: [] as Vec<Donor>,
  };

  campaignStorage.insert(id, campaign);
  return Result.Ok(campaign);
}

export function updateCampaign(
  _campaignId: string,
  _proposer: Principal,
  _title: text,
  _description: text,
): Result<Campaign, string> {
  const campaign = campaignStorage.get(_campaignId);
  if (!campaign) {
    return Result.Err<Campaign, string>(`Campaign with id=${_campaignId} not found`);
  }

  if (campaign.proposer !== _proposer) {
    return Result.Err<Campaign, string>("Unauthorized to update this campaign");
  }

  campaign.title = _title;
  campaign.description = _description;
  campaignStorage.insert(_campaignId, campaign);
  return Result.Ok<Campaign, string>(campaign);
}

export function donateCampaign(
  _campaignId: string,
  _donorId: Principal,
  _amount: number
): Result<Campaign, string> {
  const campaign = campaignStorage.get(_campaignId);
  if (!campaign) {
    return Result.Err<Campaign, string>(`Campaign with id=${_campaignId} not found`);
  }

  if (Number(ic.time()) > campaign.deadline) {
    return Result.Err<Campaign, string>("This campaign has ended");
  }

  if (campaign.goal <= campaign.totalDonations) {
    return Result.Err<Campaign, string>("The campaign has already reached its goal");
  }

  const newDonor: Donor = { id: _donorId, amount: _amount };
  campaign.donors.push(newDonor);

  if (campaign.goal <= campaign.totalDonations + _amount) {
    const refundAmount = campaign.totalDonations + _amount - campaign.goal;
    if (refundAmount > 0) {
      // Refund the exceeding amount to the donor
      // Implement a refund mechanism here
    }

    campaign.totalDonations = campaign.goal;
  } else {
    campaign.totalDonations += _amount;
  }

  campaignStorage.insert(_campaignId, campaign);
  return Result.Ok<Campaign, string>(campaign);
}

export function getCampaign(id: string): Result<Campaign, string> {
  const campaign = campaignStorage.get(id);
  if (!campaign) {
    return Result.Err<Campaign, string>(`Campaign with id=${id} not found`);
  }
  return Result.Ok<Campaign, string>(campaign);
}

export function deleteCampaign(id: string, _proposer: Principal): Result<Campaign, string> {
  const campaign = campaignStorage.get(id);
  if (!campaign) {
    return Result.Err<Campaign, string>(`Campaign with id=${id} not found`);
  }

  if (campaign.proposer !== _proposer) {
    return Result.Err<Campaign, string>("Unauthorized to delete this campaign");
  }

  campaignStorage.remove(id);
  return Result.Ok<Campaign, string>(campaign);
}
